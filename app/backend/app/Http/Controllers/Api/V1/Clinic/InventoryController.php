<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    // ── Helper: get clinic_id from auth user ──────────────────────────────────
    private function clinicId(): int
    {
        return auth()->user()->clinic_id;
    }

    /**
     * GET /api/v1/clinic/inventory
     * List all inventory items for this clinic.
     * Supports: ?branch_id=, ?category=, ?search=, ?filter=low|expiring
     */
    public function index(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();

        $query = InventoryItem::with(['branch:id,name', 'transactions' => function ($q) {
            $q->orderByDesc('performed_at')->limit(5);
        }])
        ->forClinic($clinicId)
        ->active();

        // Branch filter
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'all') {
            $query->byCategory($request->category);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name',     'like', "%{$search}%")
                  ->orWhere('sku',      'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Quick filter
        if ($request->filter === 'low') {
            $query->lowStock();
        } elseif ($request->filter === 'expiring') {
            $query->expiringWithin(90);
        }

        $items = $query->orderBy('name')->get();

        // Compute status and value per item
        $formatted = $items->map(fn($item) => $this->formatItem($item));

        // Summary metrics
        $all        = InventoryItem::forClinic($clinicId)->active()->get();
        $totalValue = $all->sum(fn($i) => $i->current_quantity * $i->unit_cost);
        $lowCount   = $all->filter(fn($i) => $i->current_quantity < $i->reorder_threshold)->count();
        $expiring   = $all->filter(fn($i) =>
            $i->expiry_date && $i->expiry_date->diffInDays(now()) <= 90
        )->count();

        return response()->json([
            'success' => true,
            'data'    => $formatted,
            'meta'    => [
                'total'       => $all->count(),
                'low_stock'   => $lowCount,
                'expiring'    => $expiring,
                'total_value' => round($totalValue, 2),
            ],
        ]);
    }

    /**
     * POST /api/v1/clinic/inventory
     * Create a new inventory item.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id'         => ['nullable', 'exists:branches,id'],
            'name'              => ['required', 'string', 'max:200'],
            'sku'               => ['required', 'string', 'max:50'],
            'category'          => ['required', 'in:restorative,consumables,pharmacy,instruments'],
            'supplier'          => ['nullable', 'string', 'max:200'],
            'location'          => ['nullable', 'string', 'max:200'],
            'current_quantity'  => ['required', 'integer', 'min:0'],
            'reorder_threshold' => ['required', 'integer', 'min:1'],
            'unit_cost'         => ['required', 'numeric', 'min:0'],
            'expiry_date'       => ['nullable', 'date', 'after:today'],
        ]);

        $clinicId = $this->clinicId();

        // Check SKU uniqueness per clinic
        $exists = InventoryItem::where('clinic_id', $clinicId)
            ->where('sku', $validated['sku'])
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => "SKU '{$validated['sku']}' already exists in this clinic.",
            ], 422);
        }

        $item = InventoryItem::create([
            ...$validated,
            'clinic_id' => $clinicId,
        ]);

        // Record initial stock transaction
        if ($item->current_quantity > 0) {
            InventoryTransaction::create([
                'clinic_id'         => $clinicId,
                'branch_id'         => $item->branch_id,
                'inventory_item_id' => $item->id,
                'performed_by'      => auth()->id(),
                'type'              => 'adjustment',
                'quantity_change'   => $item->current_quantity,
                'previous_quantity' => 0,
                'new_quantity'      => $item->current_quantity,
                'notes'             => 'Initial stock entry',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Item '{$item->name}' added to inventory.",
            'data'    => $this->formatItem($item->load('branch')),
        ], 201);
    }

    /**
     * PUT /api/v1/clinic/inventory/{item}
     * Update item details (not quantity — use adjust for that).
     */
    public function update(Request $request, InventoryItem $item): JsonResponse
    {
        $this->authorizeItem($item);

        $validated = $request->validate([
            'name'              => ['sometimes', 'string', 'max:200'],
            'category'          => ['sometimes', 'in:restorative,consumables,pharmacy,instruments'],
            'supplier'          => ['nullable', 'string', 'max:200'],
            'location'          => ['nullable', 'string', 'max:200'],
            'reorder_threshold' => ['sometimes', 'integer', 'min:1'],
            'unit_cost'         => ['sometimes', 'numeric', 'min:0'],
            'expiry_date'       => ['nullable', 'date'],
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Item updated successfully.",
            'data'    => $this->formatItem($item->fresh()->load('branch')),
        ]);
    }

    /**
     * POST /api/v1/clinic/inventory/{item}/adjust
     * Adjust stock quantity with reason tracking.
     */
    public function adjust(Request $request, InventoryItem $item): JsonResponse
    {
        $this->authorizeItem($item);

        $validated = $request->validate([
            'quantity_change' => ['required', 'integer', 'not_in:0'],
            'type'            => ['required', 'in:reorder,usage,adjustment,expiry_removal,transfer'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $previous = $item->current_quantity;
        $new      = max(0, $previous + $validated['quantity_change']);

        DB::transaction(function () use ($item, $validated, $previous, $new) {
            $item->update(['current_quantity' => $new]);

            InventoryTransaction::create([
                'clinic_id'         => $item->clinic_id,
                'branch_id'         => $item->branch_id,
                'inventory_item_id' => $item->id,
                'performed_by'      => auth()->id(),
                'type'              => $validated['type'],
                'quantity_change'   => $validated['quantity_change'],
                'previous_quantity' => $previous,
                'new_quantity'      => $new,
                'notes'             => $validated['notes'] ?? null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Stock adjusted: {$previous} → {$new}",
            'data'    => $this->formatItem($item->fresh()->load('branch')),
        ]);
    }

    /**
     * GET /api/v1/clinic/inventory/{item}/transactions
     * Get transaction history for a specific item.
     */
    public function transactions(InventoryItem $item): JsonResponse
    {
        $this->authorizeItem($item);

        $transactions = $item->transactions()
            ->with('performedBy:id,name')
            ->orderByDesc('performed_at')
            ->limit(50)
            ->get()
            ->map(fn($t) => [
                'id'                => $t->id,
                'type'              => $t->type,
                'quantity_change'   => $t->quantity_change,
                'formatted_change'  => $t->formattedChange(),
                'previous_quantity' => $t->previous_quantity,
                'new_quantity'      => $t->new_quantity,
                'notes'             => $t->notes,
                'performed_by'      => $t->performedBy?->name ?? 'System',
                'performed_at'      => $t->performed_at->format('Y-m-d H:i'),
            ]);

        return response()->json([
            'success' => true,
            'data'    => $transactions,
        ]);
    }

    /**
     * DELETE /api/v1/clinic/inventory/{item}
     * Soft-deactivate an inventory item.
     */
    public function destroy(InventoryItem $item): JsonResponse
    {
        $this->authorizeItem($item);
        $item->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => "Item '{$item->name}' removed from inventory.",
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function authorizeItem(InventoryItem $item): void
    {
        abort_if(
            $item->clinic_id !== $this->clinicId(),
            403,
            'Access denied.'
        );
    }

    private function formatItem(InventoryItem $item): array
    {
        $daysToExpiry = $item->expiry_date
            ? (int) now()->diffInDays($item->expiry_date, false)
            : null;

        // Compute status inline (avoid attribute caching issues)
        $status = 'healthy';
        if ($item->current_quantity <= 0) {
            $status = 'out_of_stock';
        } elseif ($item->current_quantity < $item->reorder_threshold) {
            $status = 'low';
        } elseif ($daysToExpiry !== null && $daysToExpiry <= 90) {
            $status = 'watch';
        }

        return [
            'id'                => $item->id,
            'name'              => $item->name,
            'sku'               => $item->sku,
            'category'          => $item->category,
            'supplier'          => $item->supplier,
            'location'          => $item->location,
            'current_quantity'  => $item->current_quantity,
            'reorder_threshold' => $item->reorder_threshold,
            'unit_cost'         => (float) $item->unit_cost,
            'stock_value'       => round($item->current_quantity * $item->unit_cost, 2),
            'expiry_date'       => $item->expiry_date?->format('Y-m-d'),
            'days_to_expiry'    => $daysToExpiry,
            'status'            => $status,
            'branch'            => $item->branch?->name ?? '—',
            'branch_id'         => $item->branch_id,
            'is_active'         => $item->is_active,
            'created_at'        => $item->created_at->format('d M Y'),
        ];
    }
}
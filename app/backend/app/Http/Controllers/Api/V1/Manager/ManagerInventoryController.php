<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;

class ManagerInventoryController extends Controller
{
    // ── List items ─────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $query = InventoryItem::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->orderBy('name');

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('sku',  'like', "%{$term}%");
            });
        }

        $items = $query->get()->map(fn($i) => $this->format($i));

        return response()->json([
            'success' => true,
            'data'    => $items,
        ]);
    }

    // ── Show single item ───────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $item = InventoryItem::where('clinic_id', $request->user()->clinic_id)
            ->where('branch_id', $request->user()->branch_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $this->format($item),
        ]);
    }

    // ── Create item ────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'name'              => 'required|string|max:255',
            'sku'               => 'nullable|string|max:100',
            'unit'              => 'nullable|string|max:50',
            'current_quantity'  => 'required|numeric|min:0',
            'reorder_threshold' => 'required|numeric|min:0',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $item = InventoryItem::create([
            'clinic_id'         => $clinicId,
            'branch_id'         => $branchId,
            'name'              => $request->name,
            'sku'               => $request->sku,
            'unit'              => $request->unit ?? 'units',
            'current_quantity'  => $request->current_quantity,
            'reorder_threshold' => $request->reorder_threshold,
            'notes'             => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inventory item added.',
            'data'    => $this->format($item),
        ], 201);
    }

    // ── Update item ────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $item = InventoryItem::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->findOrFail($id);

        $request->validate([
            'name'              => 'sometimes|string|max:255',
            'sku'               => 'nullable|string|max:100',
            'unit'              => 'nullable|string|max:50',
            'current_quantity'  => 'sometimes|numeric|min:0',
            'reorder_threshold' => 'sometimes|numeric|min:0',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $item->update($request->only([
            'name', 'sku', 'unit',
            'current_quantity', 'reorder_threshold', 'notes',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Item updated.',
            'data'    => $this->format($item->fresh()),
        ]);
    }

    // ── Delete item ────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $item = InventoryItem::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->findOrFail($id);

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted.',
        ]);
    }

    // ── Adjust stock ───────────────────────────────────────
    public function adjust(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $request->validate([
            'type'     => 'required|in:add,remove',
            'quantity' => 'required|numeric|min:1',
            'reason'   => 'nullable|string|max:255',
        ]);

        $item = InventoryItem::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->findOrFail($id);

        $qty = (float) $request->quantity;

        if ($request->type === 'add') {
            $item->increment('current_quantity', $qty);
        } else {
            $newQty = max(0, $item->current_quantity - $qty);
            $item->update(['current_quantity' => $newQty]);
        }

        // Log transaction if model exists
        if (class_exists(InventoryTransaction::class)) {
            InventoryTransaction::create([
                'clinic_id'    => $manager->clinic_id,
                'branch_id'    => $manager->branch_id,
                'inventory_item_id' => $item->id,
                'type'         => $request->type,
                'quantity'     => $qty,
                'reason'       => $request->reason,
                'created_by'   => $manager->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted.',
            'data'    => $this->format($item->fresh()),
        ]);
    }

    // ── Format helper ──────────────────────────────────────
    private function format(InventoryItem $i): array
    {
        return [
            'id'                => $i->id,
            'name'              => $i->name,
            'sku'               => $i->sku,
            'unit'              => $i->unit ?? 'units',
            'current_quantity'  => (float) $i->current_quantity,
            'reorder_threshold' => (float) $i->reorder_threshold,
            'notes'             => $i->notes,
            'branch_id'         => $i->branch_id,
            'clinic_id'         => $i->clinic_id,
            'created_at'        => $i->created_at->toDateTimeString(),
        ];
    }
}
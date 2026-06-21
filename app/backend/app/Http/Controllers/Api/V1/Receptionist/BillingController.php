<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Services\NotificationService;
use Carbon\Carbon;

class BillingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $query = Invoice::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereNotIn('lifecycle_status', [Invoice::STATUS_DRAFT])
            ->with('patient');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('patient', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $invoices = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $invoices->map(fn($i) => [
                'id'               => $i->id,
                'invoice_number'   => $i->invoice_number,
                'invoice_type'     => $i->invoice_type ?? 'service',
                'patient'          => [
                    'id'        => $i->patient?->id,
                    'full_name' => $i->patient?->full_name ?? '—',
                ],
                'amount'           => $i->total,
                'balance'          => $i->balance,
                'tax_amount'       => (float) ($i->tax_amount ?? 0),
                'tax_rate'         => (float) ($i->tax_rate ?? 15),
                'status'           => $i->status,
                'lifecycle_status' => $i->lifecycle_status ?? $i->status,
                'issued_at'        => $i->issued_at?->toDateString(),
                'isCardInvoice'    => $i->isCardInvoice(),
            ]),
            'meta' => [
                'total'        => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'due_date' => 'nullable|date|after_or_equal:today',
        ]);

        $subtotal  = collect($validated['items'])->sum(fn($item) => $item['quantity'] * $item['unit_price']);
        $clinic    = \App\Models\Clinic::find($user->clinic_id);
        $taxRate   = (float) ($clinic?->getSetting('tax_rate', 15) ?? 15);
        $taxAmount = round($subtotal * ($taxRate / 100), 2);
        $total     = $subtotal + $taxAmount;

        // Race-condition-safe invoice number
        $invoiceNumber = Invoice::generateNumber($user->clinic_id);

        $invoice = Invoice::create([
            'clinic_id'        => $user->clinic_id,
            'branch_id'        => $user->branch_id,
            'patient_id'       => $validated['patient_id'],
            'invoice_number'   => $invoiceNumber,
            'invoice_type'     => Invoice::TYPE_SERVICE,
            'lifecycle_status' => Invoice::STATUS_UNPAID,
            'issued_at'        => Carbon::now(),
            'due_date'         => $validated['due_date'] ?? Carbon::now()->addDays(15),
            'total'            => $total,
            'tax_rate'         => $taxRate,
            'tax_amount'       => $taxAmount,
            'paid'             => 0,
            'balance'          => $total,
            'status'           => 'sent',
            'created_by'       => $user->id,
            'notes'            => null,
        ]);

        foreach ($validated['items'] as $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        // ── Dispatch notification to accountant and patient ──
        NotificationService::invoiceCreated($invoice, $user);

        return response()->json([
            'success' => true,
            'message' => 'Invoice created successfully.',
            'data' => $invoice,
        ], 201);
    }

    /**
     * Record payment - DISABLED for receptionist.
     * All payments must be processed by the accountant.
     */
    public function recordPayment(Request $request, $id): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Payments are processed by the accountant.',
            'code'    => 'PAYMENT_NOT_ALLOWED',
        ], 403);
    }

    public function recentPayments(Request $request): JsonResponse
    {
        $user = $request->user();

        $payments = Payment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->with(['invoice.patient'])
            ->orderByDesc('paid_at')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'invoice_number' => $p->invoice?->invoice_number,
                'patient_name' => $p->invoice?->patient?->full_name ?? '—',
                'amount' => $p->amount,
                'method' => $p->payment_method,
                'paid_at' => $p->paid_at->toDateString(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }
}
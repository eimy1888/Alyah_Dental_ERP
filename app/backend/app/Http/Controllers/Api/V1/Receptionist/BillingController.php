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
                'id' => $i->id,
                'invoice_number' => $i->invoice_number,
                'patient' => [
                    'id' => $i->patient?->id,
                    'full_name' => $i->patient?->full_name ?? '—',
                ],
                'amount' => $i->total,
                'balance' => $i->balance,
                'status' => $i->status,
                'issued_at' => $i->issued_at?->toDateString(),
            ]),
            'meta' => [
                'total' => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
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

        $subtotal = collect($validated['items'])->sum(fn($item) => $item['quantity'] * $item['unit_price']);
        $taxRate  = 15;
        $taxAmount = $subtotal * ($taxRate / 100);
        $total     = $subtotal + $taxAmount;

        // Race-condition-safe invoice number
        $invoiceNumber = Invoice::generateNumber($user->clinic_id);

        $invoice = Invoice::create([
            'clinic_id' => $user->clinic_id,
            'branch_id' => $user->branch_id,
            'patient_id' => $validated['patient_id'],
            'invoice_number' => $invoiceNumber,
            'issued_at' => Carbon::now(),
            'due_date' => $validated['due_date'] ?? Carbon::now()->addDays(15),
            'total' => $total,
            'paid' => 0,
            'balance' => $total,
            'status' => 'sent',
            'created_by' => $user->id,
            'notes' => null,
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
     * Record payment for an invoice
     * 
     * FIXED: Removed duplicate code, using correct column names (paid, balance)
     * Activates clinic card automatically when card invoice is fully paid
     */
    public function recordPayment(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        $invoice = Invoice::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $invoice->balance,
            'payment_method' => 'required|in:cash,telebirr,bank_transfer',
            'reference' => 'nullable|string|max:255',
        ]);

        $amount = floatval($validated['amount']);

        // Create payment record
        $payment = Payment::create([
            'clinic_id' => $user->clinic_id,
            'branch_id' => $user->branch_id,
            'invoice_id' => $invoice->id,
            'patient_id' => $invoice->patient_id,
            'amount' => $amount,
            'payment_method' => $validated['payment_method'],
            'reference' => $validated['reference'] ?? 'PAY-' . strtoupper(uniqid()),
            'status' => 'completed',
            'collected_by' => $user->id,
            'paid_at' => Carbon::now(),
        ]);

        // Update invoice paid amount and balance
        $newPaidAmount = floatval($invoice->paid) + $amount;
        $newBalance = floatval($invoice->total) - $newPaidAmount;
        $status = $newBalance <= 0 ? 'paid' : 'partial';

        $invoice->update([
            'paid' => $newPaidAmount,
            'balance' => max(0, $newBalance),
            'status' => $status,
        ]);

        // ── Activate clinic card if this invoice contains card purchase AND is now fully paid ──
        $invoice->refresh();
        
        // Check if this invoice has a clinic card purchase
        $hasCardPurchase = $invoice->items()->where('description', 'like', '%Clinic Card%')->exists();
        
        if ($hasCardPurchase && $invoice->status === 'paid') {
            $patient = $invoice->patient;
            if ($patient && !$patient->hasActiveCard()) {
                // Generate unique card number
                $cardNumber = 'CARD-' . str_pad($patient->id, 6, '0', STR_PAD_LEFT) . '-' . date('Ymd');
                $patient->activateCard($cardNumber);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully.' . 
                ($hasCardPurchase && $invoice->status === 'paid' ? ' Clinic card activated.' : ''),
            'data' => $payment,
        ]);
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
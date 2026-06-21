<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * InvoiceReviewController — simplified per the new billing model.
 *
 * REQ-12: Accountant records full payments. No approval workflow.
 * REQ-1:  Three states only: UNPAID → PAID → LOCKED.
 * REQ-3:  Full payment only — partial payments rejected.
 * REQ-15: Emergency debt handling.
 *
 * Dashboard sections:
 *   - unpaid:  invoices awaiting payment (UNPAID)
 *   - paid:    recently paid invoices
 *   - locked:  locked audit records
 *
 * REMOVED: review-queue, send-back, discount, insurance, approval workflow.
 */
class InvoiceReviewController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // UNPAID INVOICES (replaces old review-queue)
    // GET /accountant/invoices/unpaid
    // ─────────────────────────────────────────────────────────────────────────
    public function unpaidList(Request $request): JsonResponse
    {
        $accountant = $request->user();

        $query = Invoice::where('clinic_id', $accountant->clinic_id)
            ->where('lifecycle_status', Invoice::STATUS_UNPAID)
            ->with(['patient:id,first_name,last_name,has_debt,debt_amount', 'appointment.dentist:id,name'])
            ->latest('issued_at');

        if ($request->filled('invoice_type')) {
            $query->where('invoice_type', $request->invoice_type);
        }

        $invoices = $query->paginate((int) ($request->per_page ?? 20));

        return response()->json([
            'success' => true,
            'data'    => $invoices->through(fn($i) => $this->formatInvoice($i)),
            'meta'    => [
                'total'        => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FULL INVOICE LIST (unpaid + paid + locked — NOT draft)
    // GET /accountant/invoices/all
    // ─────────────────────────────────────────────────────────────────────────
    public function allInvoices(Request $request): JsonResponse
    {
        $accountant = $request->user();

        $query = Invoice::where('clinic_id', $accountant->clinic_id)
            // Accountant NEVER sees DRAFT invoices — those are still with the dentist
            ->whereNotIn('lifecycle_status', [Invoice::STATUS_DRAFT])
            ->with(['patient:id,first_name,last_name', 'appointment.dentist:id,name'])
            ->latest('issued_at');

        if ($request->filled('lifecycle_status')) {
            $query->where('lifecycle_status', $request->lifecycle_status);
        }
        if ($request->filled('invoice_type')) {
            $query->where('invoice_type', $request->invoice_type);
        }
        if ($request->filled('search')) {
            $query->whereHas('patient', fn($q) => $q
                ->where('first_name', 'like', '%' . $request->search . '%')
                ->orWhere('last_name', 'like', '%' . $request->search . '%')
            );
        }

        $invoices = $query->paginate((int) ($request->per_page ?? 20));

        return response()->json([
            'success' => true,
            'data'    => $invoices->through(fn($i) => $this->formatInvoice($i)),
            'meta'    => [
                'total'        => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW INVOICE DETAIL
    // GET /accountant/invoices/{id}/detail
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT) // accountant cannot view DRAFT
            ->with(['patient', 'items', 'payments', 'appointment.dentist:id,name'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $invoice->getBillingBreakdown(),
                [
                    'patient' => [
                        'id'        => $invoice->patient?->id,
                        'full_name' => $invoice->patient?->full_name,
                        'phone'     => $invoice->patient?->phone,
                        'has_debt'  => (bool) ($invoice->patient?->has_debt ?? false),
                    ],
                    'dentist'   => $invoice->appointment?->dentist?->name ?? '—',
                    'payments'  => $invoice->payments->map(fn($p) => [
                        'id'        => $p->id,
                        'amount'    => (float) $p->amount,
                        'method'    => $p->method,
                        'reference' => $p->reference,
                        'paid_at'   => $p->paid_at?->toDateTimeString(),
                    ]),
                    'is_emergency' => (bool) ($invoice->appointment?->is_emergency_bypass ?? false),
                    'payment_banner' => $invoice->lifecycle_status === Invoice::STATUS_UNPAID
                        ? 'PAYMENT REQUIRED — ETB ' . number_format($invoice->balance, 2)
                        : null,
                ]
            ),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORD FULL PAYMENT  POST /accountant/invoices/{id}/payments
    // REQ-3: Full payment only. Partial payments are rejected.
    // REQ-12: Accountant records payment. Triggers treatment activation.
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,telebirr,bank_transfer,chapa,card',
            'reference'      => 'nullable|string|max:255',
        ]);

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT) // DRAFT cannot be paid
            ->with(['patient', 'appointment.treatmentPlan'])
            ->findOrFail($id);

        $result = $invoice->recordFullPayment(
            (float) $request->amount,
            $request->payment_method,
            $accountant,
            $request->reference ?? ''
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        // REQ-15: Clear debt flag if emergency invoice is now paid
        $patient = $invoice->patient;
        if ($patient && $patient->has_debt && $patient->debt_invoice_id === $invoice->id) {
            $patient->clearDebt();
        }

        // Fire invoice paid notifications (patient email + dentist DB)
        \App\Services\NotificationService::invoicePaid($invoice->fresh());

        // Activate treatment on payment — covers all pre-treatment statuses
        $appointment = $invoice->appointment;
        if ($appointment && in_array($appointment->status, ['confirmed', 'checked_in', 'in_progress'])) {
            \DB::table('notifications')->insert([
                'id'              => \Illuminate\Support\Str::uuid(),
                'type'            => 'treatment_activated',
                'notifiable_type' => \App\Models\User::class,
                'notifiable_id'   => $appointment->dentist_id,
                'data'            => json_encode([
                    'title'   => 'Payment Received — Start Treatment',
                    'message' => "Invoice {$invoice->invoice_number} paid. Start treatment for {$patient?->full_name}.",
                    'appointment_id' => $appointment->id,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $appointment->update(['status' => 'treatment_started']);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data'    => $result['data'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLAG EMERGENCY DEBT  POST /accountant/invoices/{id}/flag-debt
    // REQ-15: When emergency patient cannot pay before discharge.
    // ─────────────────────────────────────────────────────────────────────────
    public function flagDebt(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)
            ->with('patient')
            ->findOrFail($id);

        $appointment = $invoice->appointment;
        if (!$appointment?->is_emergency_bypass) {
            return response()->json([
                'success' => false,
                'message' => 'Debt flagging is only for emergency appointments.',
            ], 422);
        }

        $patient = $invoice->patient;
        if (!$patient) {
            return response()->json(['success' => false, 'message' => 'Patient not found.'], 404);
        }

        $patient->flagDebt((float) $invoice->balance, $invoice->id, $accountant->id);

        return response()->json([
            'success' => true,
            'message' => "Patient {$patient->full_name} flagged with outstanding debt of ETB " .
                number_format($invoice->balance, 2) . ".",
            'data'    => [
                'patient_id'   => $patient->id,
                'has_debt'     => true,
                'debt_amount'  => (float) $invoice->balance,
                'invoice_id'   => $invoice->id,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEBT LIST  GET /accountant/invoices/debts
    // REQ-15: Patients with outstanding emergency debt.
    // ─────────────────────────────────────────────────────────────────────────
    public function debtList(Request $request): JsonResponse
    {
        $accountant = $request->user();

        $patients = Patient::where('clinic_id', $accountant->clinic_id)
            ->where('has_debt', true)
            ->with(['invoices' => fn($q) => $q->where('lifecycle_status', Invoice::STATUS_UNPAID)])
            ->get()
            ->map(fn($p) => [
                'id'            => $p->id,
                'full_name'     => $p->full_name,
                'phone'         => $p->phone,
                'debt_amount'   => (float) $p->debt_amount,
                'debt_invoice_id' => $p->debt_invoice_id,
                'debt_flagged_at' => $p->debt_flagged_at?->toDateTimeString(),
            ]);

        return response()->json(['success' => true, 'data' => $patients]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function formatInvoice(Invoice $i): array
    {
        $isEmergency = (bool) ($i->appointment?->is_emergency_bypass ?? false);
        return [
            'id'               => $i->id,
            'invoice_number'   => $i->invoice_number,
            'invoice_type'     => $i->invoice_type ?? 'treatment',
            'lifecycle_status' => $i->lifecycle_status,
            'patient_name'     => $i->patient?->full_name ?? '—',
            'patient_has_debt' => (bool) ($i->patient?->has_debt ?? false),
            'dentist_name'     => $i->appointment?->dentist?->name ?? '—',
            'total'            => (float) $i->total,
            'balance'          => (float) $i->balance,
            'is_emergency'     => $isEmergency,
            'payment_banner'   => $i->lifecycle_status === Invoice::STATUS_UNPAID
                ? ($isEmergency ? '🚨 EMERGENCY — PAYMENT REQUIRED — ETB ' : 'PAYMENT REQUIRED — ETB ') .
                  number_format($i->balance, 2)
                : null,
            'issued_at'        => $i->issued_at?->toDateString(),
            'created_at'       => $i->created_at?->toDateTimeString(),
        ];
    }
}

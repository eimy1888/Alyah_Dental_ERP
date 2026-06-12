<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\BillingEvent;
use App\Services\InvoiceLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AppointmentBillingController — receptionist billing actions.
 *
 * Receptionists can:
 *   - View consolidated billing for an appointment
 *   - Record pre-payments (deposits) on service or treatment invoices
 *   - Record final payments after treatment
 *   - View billing event log
 *
 * Receptionists CANNOT:
 *   - Create treatment invoices (system/dentist only)
 *   - Modify invoice items
 *   - Lock invoices
 */
class AppointmentBillingController extends Controller
{
    public function __construct(private InvoiceLifecycleService $lifecycle) {}

    // ─────────────────────────────────────────────────────────────────────────
    // GET CONSOLIDATED BILLING FOR APPOINTMENT
    // GET /receptionist/appointments/{id}/billing
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $appointment = Appointment::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->findOrFail($id);

        $billing = $this->lifecycle->getConsolidatedBilling($appointment);

        return response()->json([
            'success' => true,
            'data'    => $billing,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORD PRE-PAYMENT (deposit before treatment complete)
    // POST /receptionist/appointments/{id}/billing/prepay
    // DISABLED: All payments must be processed by the accountant
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPrePayment(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'All payments must be processed by the accountant. Please direct the patient to the accounts department.',
            'code'    => 'PAYMENT_NOT_ALLOWED',
        ], 403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORD FINAL PAYMENT
    // POST /receptionist/invoices/{id}/pay
    // DISABLED: All payments must be processed by the accountant
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'All payments must be processed by the accountant. Please direct the patient to the accounts department.',
            'code'    => 'PAYMENT_NOT_ALLOWED',
        ], 403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEW BILLING EVENTS LOG
    // GET /receptionist/invoices/{id}/events
    // ─────────────────────────────────────────────────────────────────────────
    public function events(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $invoice = Invoice::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->findOrFail($id);

        $events = BillingEvent::where('invoice_id', $invoice->id)
            ->with('triggeredBy:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn($e) => [
                'event'         => $e->event_type,
                'amount_impact' => (float) $e->amount_impact,
                'total_before'  => (float) $e->invoice_total_before,
                'total_after'   => (float) $e->invoice_total_after,
                'triggered_by'  => $e->triggeredBy?->name ?? 'System',
                'at'            => $e->created_at->format('d M Y H:i'),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'invoice_number'   => $invoice->invoice_number,
                'lifecycle_status' => $invoice->lifecycle_status ?? $invoice->status,
                'total'            => (float) $invoice->total,
                'events'           => $events,
            ],
        ]);
    }
}

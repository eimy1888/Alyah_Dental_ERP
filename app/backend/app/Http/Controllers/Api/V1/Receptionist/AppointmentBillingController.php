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
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPrePayment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,telebirr,bank_transfer',
            'invoice_type'   => 'nullable|in:service,treatment',
            'reference'      => 'nullable|string|max:255',
        ]);

        $appointment = Appointment::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->findOrFail($id);

        // Determine which invoice to apply pre-payment to
        $invoiceType = $request->invoice_type ?? 'service';
        $invoice = $invoiceType === 'service'
            ? ($appointment->serviceInvoice ?? $appointment->getActiveTreatmentInvoice())
            : $appointment->getActiveTreatmentInvoice();

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'No invoice found for this appointment.',
                'code'    => 'NO_INVOICE',
            ], 404);
        }

        $result = $this->lifecycle->recordPrePayment(
            $invoice,
            (float) $request->amount,
            $request->payment_method,
            $user,
            $request->reference ?? ''
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data'    => $result['data'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORD FINAL PAYMENT
    // POST /receptionist/invoices/{id}/pay
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,telebirr,bank_transfer',
            'reference'      => 'nullable|string|max:255',
        ]);

        $invoice = Invoice::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->findOrFail($id);

        $result = $this->lifecycle->recordPayment(
            $invoice,
            (float) $request->amount,
            $request->payment_method,
            $user,
            $request->reference ?? ''
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data'    => $result['data'],
        ]);
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

<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use App\Models\BillingEvent;
use App\Models\Invoice;
use App\Services\InvoiceLifecycleService;
use App\Events\InvoiceLocked;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * InvoiceReviewController — accountant invoice review queue.
 *
 * The review queue shows:
 *   - in_progress   — dentist still working
 *   - under_review  — dentist finalized, accountant must verify
 *   - discrepancy   — sent back for revision
 *
 * Accountant can: lock, send back, add review notes, view billing event log.
 */
class InvoiceReviewController extends Controller
{
    public function __construct(private InvoiceLifecycleService $lifecycle) {}

    // ─────────────────────────────────────────────────────────────────────────
    // REVIEW QUEUE — categorized list
    // GET /accountant/invoices/review-queue
    // ─────────────────────────────────────────────────────────────────────────
    public function reviewQueue(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;

        $baseQuery = Invoice::where('clinic_id', $clinicId)
            ->with(['patient:id,first_name,last_name', 'episode', 'appointment'])
            ->whereNotNull('lifecycle_status');

        // in_progress + updated (dentist still building)
        $inProgress = (clone $baseQuery)
            ->whereIn('lifecycle_status', [Invoice::STATUS_IN_PROGRESS, Invoice::STATUS_UPDATED])
            ->where('invoice_type', 'treatment')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($i) => $this->formatReviewItem($i));

        // under_review (ready for accountant)
        $underReview = (clone $baseQuery)
            ->where('lifecycle_status', Invoice::STATUS_UNDER_REVIEW)
            ->orderBy('submitted_for_review_at')
            ->get()
            ->map(fn($i) => $this->formatReviewItem($i));

        // sent back / discrepancy (dentist needs to fix)
        $discrepancy = (clone $baseQuery)
            ->where('lifecycle_status', Invoice::STATUS_IN_PROGRESS)
            ->whereNotNull('review_notes')
            ->where('review_notes', 'like', '%SENT BACK%')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($i) => $this->formatReviewItem($i));

        return response()->json([
            'success' => true,
            'data'    => [
                'in_progress'  => $inProgress,
                'under_review' => $underReview,
                'discrepancy'  => $discrepancy,
                'counts'       => [
                    'in_progress'  => $inProgress->count(),
                    'under_review' => $underReview->count(),
                    'discrepancy'  => $discrepancy->count(),
                ],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW INVOICE WITH FULL DETAIL + EVENTS LOG
    // GET /accountant/invoices/{id}/review
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)
            ->with([
                'patient',
                'items.addedBy:id,name',
                'episode.procedures.service',
                'episode.projections',
                'payments',
                'appointment.dentist:id,name',
            ])
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
                'metadata'      => $e->metadata,
            ]);

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $invoice->getBillingBreakdown(),
                [
                    'patient'        => [
                        'id'         => $invoice->patient?->id,
                        'full_name'  => $invoice->patient?->full_name,
                        'phone'      => $invoice->patient?->phone,
                        'insurance'  => $invoice->patient?->insurance_provider,
                    ],
                    'dentist'        => $invoice->appointment?->dentist?->name ?? '—',
                    'billing_events' => $events,
                    'payments'       => $invoice->payments->map(fn($p) => [
                        'id'        => $p->id,
                        'amount'    => (float) $p->amount,
                        'method'    => $p->method,
                        'reference' => $p->reference,
                        'paid_at'   => $p->paid_at?->toDateTimeString(),
                    ]),
                    'review_notes'   => $invoice->review_notes,
                ]
            ),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOCK INVOICE
    // POST /accountant/invoices/{id}/lock
    // ─────────────────────────────────────────────────────────────────────────
    public function lock(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)->findOrFail($id);

        $result = $this->lifecycle->lockInvoice($invoice, $accountant);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        event(new InvoiceLocked($invoice->fresh(), $accountant));

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data'    => $result['data'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEND BACK FOR REVISION
    // POST /accountant/invoices/{id}/send-back
    // ─────────────────────────────────────────────────────────────────────────
    public function sendBack(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)->findOrFail($id);

        $result = $this->lifecycle->sendBackForRevision($invoice, $accountant, $request->reason);

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
    // RECORD PAYMENT (post lock)
    // POST /accountant/invoices/{id}/payments
    // ─────────────────────────────────────────────────────────────────────────
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,telebirr,bank_transfer,insurance,card',
            'reference'      => 'nullable|string|max:255',
        ]);

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)->findOrFail($id);

        $result = $this->lifecycle->recordPayment(
            $invoice,
            (float) $request->amount,
            $request->payment_method,
            $accountant,
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
    // APPLY DISCOUNT TO INVOICE
    // POST /accountant/invoices/{id}/discount
    // ─────────────────────────────────────────────────────────────────────────
    public function applyDiscount(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'discount_amount' => 'required|numeric|min:0',
            'reason'          => 'required|string|max:500',
        ]);

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)->findOrFail($id);

        if ($invoice->lifecycle_status === Invoice::STATUS_LOCKED) {
            return response()->json(['success' => false, 'message' => 'Cannot discount a locked invoice.'], 422);
        }

        $previousTotal = (float) $invoice->total;
        $invoice->update(['discount_total' => (float) $request->discount_amount]);
        $invoice->recalculate();
        $invoice->refresh();

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_DISCOUNT_APPLIED,
            -(float) $request->discount_amount,
            (float) $invoice->total,
            ['reason' => $request->reason, 'discount' => $request->discount_amount],
            $accountant->id,
            $invoice->appointment_id
        );

        return response()->json([
            'success' => true,
            'message' => "Discount of ETB {$request->discount_amount} applied.",
            'data'    => [
                'previous_total'  => $previousTotal,
                'discount_applied'=> (float) $request->discount_amount,
                'new_total'       => (float) $invoice->total,
                'balance'         => (float) $invoice->balance,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY INSURANCE COVERAGE
    // POST /accountant/invoices/{id}/insurance
    // ─────────────────────────────────────────────────────────────────────────
    public function applyInsurance(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'coverage_amount' => 'required|numeric|min:0',
            'provider'        => 'required|string|max:255',
        ]);

        $invoice = Invoice::where('clinic_id', $accountant->clinic_id)->findOrFail($id);

        if ($invoice->lifecycle_status === Invoice::STATUS_LOCKED) {
            return response()->json(['success' => false, 'message' => 'Cannot modify a locked invoice.'], 422);
        }

        $coverage = min((float) $request->coverage_amount, (float) $invoice->total);
        $invoice->update(['insurance_coverage' => $coverage]);
        $invoice->recalculate();
        $invoice->refresh();

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_INSURANCE_APPLIED,
            -$coverage,
            (float) $invoice->total,
            ['provider' => $request->provider, 'coverage' => $coverage],
            $accountant->id,
            $invoice->appointment_id
        );

        return response()->json([
            'success' => true,
            'message' => "Insurance coverage of ETB {$coverage} applied.",
            'data'    => [
                'insurance_coverage' => $coverage,
                'new_total'          => (float) $invoice->total,
                'patient_liability'  => (float) $invoice->balance,
            ],
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatReviewItem(Invoice $invoice): array
    {
        return [
            'id'                      => $invoice->id,
            'invoice_number'          => $invoice->invoice_number,
            'invoice_type'            => $invoice->invoice_type ?? 'treatment',
            'lifecycle_status'        => $invoice->lifecycle_status,
            'patient_name'            => $invoice->patient?->full_name ?? '—',
            'total'                   => (float) $invoice->total,
            'balance'                 => (float) $invoice->balance,
            'pre_paid'                => (float) ($invoice->pre_paid ?? 0),
            'submitted_for_review_at' => $invoice->submitted_for_review_at?->toDateTimeString(),
            'finalized_by'            => $invoice->finalizedBy?->name ?? '—',
            'review_notes'            => $invoice->review_notes,
            'episode_phase'           => $invoice->episode?->phase_number,
        ];
    }
}

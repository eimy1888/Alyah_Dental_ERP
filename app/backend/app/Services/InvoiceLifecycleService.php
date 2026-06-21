<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BillingEvent;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\TreatmentEpisode;
use App\Models\User;

/**
 * InvoiceLifecycleService — manages state transitions on invoices.
 *
 * Dentist:     finalize episode  → invoice goes to under_review
 * Accountant:  review queue      → lock or send back
 * Receptionist:record payment    → invoice goes to paid/partial
 * Any role:    pre-payment       → deposit tracked
 */
class InvoiceLifecycleService
{
    /**
     * Dentist finalizes a treatment episode.
     * Episode → finalized, invoice → under_review.
     */
    public function finalizeEpisode(TreatmentEpisode $episode, User $dentist): array
    {
        if (!$episode->isEditable()) {
            return [
                'success' => false,
                'message' => "Episode is already {$episode->status}. Cannot finalize.",
            ];
        }

        if (!$episode->procedures()->where('status', 'performed')->exists()) {
            return [
                'success' => false,
                'message' => 'No performed procedures found. Add at least one procedure before finalizing.',
                'code'    => 'NO_PROCEDURES',
            ];
        }

        $episode->finalize($dentist);  // also calls invoice->submitForReview()

        $invoice = $episode->invoice;

        return [
            'success' => true,
            'message' => 'Episode finalized. Invoice is now under review.',
            'data'    => [
                'episode_id'       => $episode->id,
                'episode_status'   => $episode->fresh()->status,
                'invoice_id'       => $invoice?->id,
                'invoice_number'   => $invoice?->invoice_number,
                'lifecycle_status' => $invoice?->fresh()->lifecycle_status,
                'total'            => (float) ($invoice?->total ?? 0),
                'finalized_at'     => $episode->fresh()->finalized_at?->toDateTimeString(),
            ],
        ];
    }

    /**
     * Accountant locks a finalized invoice.
     * Must be under_review first.
     */
    public function lockInvoice(Invoice $invoice, User $accountant): array
    {
        if ($invoice->lifecycle_status === Invoice::STATUS_LOCKED) {
            return ['success' => false, 'message' => 'Invoice is already locked.'];
        }

        if ($invoice->lifecycle_status !== Invoice::STATUS_UNDER_REVIEW) {
            return [
                'success' => false,
                'message' => "Invoice must be under_review to lock. Current status: {$invoice->lifecycle_status}",
                'code'    => 'INVALID_LIFECYCLE',
            ];
        }

        $invoice->lock($accountant);

        // Mark episode as billed
        TreatmentEpisode::where('invoice_id', $invoice->id)
            ->whereIn('status', [TreatmentEpisode::STATUS_FINALIZED])
            ->update(['status' => TreatmentEpisode::STATUS_BILLED]);

        return [
            'success' => true,
            'message' => 'Invoice locked. No further changes permitted.',
            'data'    => [
                'invoice_id'       => $invoice->id,
                'invoice_number'   => $invoice->invoice_number,
                'lifecycle_status' => $invoice->fresh()->lifecycle_status,
                'locked_at'        => $invoice->fresh()->locked_at?->toDateTimeString(),
                'locked_by'        => $accountant->name,
            ],
        ];
    }

    /**
     * Accountant sends invoice back to dentist for revision.
     */
    public function sendBackForRevision(Invoice $invoice, User $accountant, string $reason): array
    {
        if ($invoice->lifecycle_status === Invoice::STATUS_LOCKED) {
            return ['success' => false, 'message' => 'Locked invoices cannot be sent back.'];
        }

        $invoice->sendBackForRevision($accountant, $reason);

        // Re-open the episode
        TreatmentEpisode::where('invoice_id', $invoice->id)
            ->where('status', TreatmentEpisode::STATUS_FINALIZED)
            ->update(['status' => TreatmentEpisode::STATUS_OPEN]);

        return [
            'success' => true,
            'message' => 'Invoice sent back for revision.',
            'data'    => [
                'invoice_id'       => $invoice->id,
                'lifecycle_status' => $invoice->fresh()->lifecycle_status,
                'review_notes'     => $invoice->fresh()->review_notes,
            ],
        ];
    }

    /**
     * Record a pre-payment (deposit) before treatment is complete.
     * Works on any non-locked invoice.
     */
    public function recordPrePayment(
        Invoice $invoice,
        float   $amount,
        string  $method,
        User    $collectedBy,
        string  $reference = ''
    ): array {
        if (in_array($invoice->lifecycle_status, [Invoice::STATUS_CANCELLED])) {
            return ['success' => false, 'message' => 'Cannot record payment on a cancelled invoice.'];
        }

        // Pre-payments are not allowed on DRAFT invoices (dentist still working)
        if ($invoice->lifecycle_status === Invoice::STATUS_DRAFT) {
            return [
                'success' => false,
                'message' => 'Invoice is still in draft. Dentist must complete the checkup before any payment can be collected.',
                'code'    => 'INVOICE_DRAFT',
            ];
        }

        if ($amount <= 0) {
            return ['success' => false, 'message' => 'Payment amount must be greater than zero.'];
        }

        $payment = Payment::create([
            'clinic_id'    => $invoice->clinic_id,
            'branch_id'    => $invoice->branch_id,
            'invoice_id'   => $invoice->id,
            'patient_id'   => $invoice->patient_id,
            'amount'       => $amount,
            'method'       => $method,
            'reference'    => $reference ?: 'PRE-' . strtoupper(uniqid()),
            'status'       => 'completed',
            'collected_by' => $collectedBy->id,
            'paid_at'      => now(),
            'notes'        => 'Pre-payment / deposit',
        ]);

        $invoice->update(['pre_paid' => (float) $invoice->pre_paid + $amount]);
        $invoice->recalculate();
        $invoice->refresh();

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_PREPAYMENT_RECORDED,
            $amount,
            (float) $invoice->total,
            ['method' => $method, 'payment_id' => $payment->id, 'reference' => $payment->reference],
            $collectedBy->id,
            $invoice->appointment_id
        );

        return [
            'success' => true,
            'message' => "Pre-payment of ETB {$amount} recorded.",
            'data'    => [
                'payment_id'       => $payment->id,
                'reference'        => $payment->reference,
                'amount'           => $amount,
                'invoice_total'    => (float) $invoice->total,
                'invoice_pre_paid' => (float) $invoice->pre_paid,
                'invoice_balance'  => (float) $invoice->balance,
                'lifecycle_status' => $invoice->lifecycle_status,
            ],
        ];
    }

    /**
     * Record a final payment on a locked invoice.
     * Activates clinic card if applicable.
     */
    public function recordPayment(
        Invoice $invoice,
        float   $amount,
        string  $method,
        User    $collectedBy,
        string  $reference = ''
    ): array {
        return $invoice->recordFullPayment(
            $amount,
            $method,
            $collectedBy,
            $reference ?: 'PAY-' . strtoupper(uniqid())
        );
    }

    /**
     * Get the full consolidated billing view for an appointment.
     * Used by dentist billing preview and accountant invoice review.
     */
    public function getConsolidatedBilling(Appointment $appointment): array
    {
        $appointment->load([
            'serviceInvoice.items',
            'treatmentInvoice.items',
            'episodes.procedures',
            'episodes.projections',
        ]);

        $serviceInv   = $appointment->serviceInvoice;
        $treatmentInv = $appointment->treatmentInvoice ?? $appointment->invoice ?? null;

        $events = BillingEvent::where('appointment_id', $appointment->id)
            ->with('triggeredBy:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn($e) => [
                'event'         => $e->event_type,
                'amount_impact' => (float) $e->amount_impact,
                'total_before'  => (float) $e->invoice_total_before,
                'total_after'   => (float) $e->invoice_total_after,
                'triggered_by'  => $e->triggeredBy?->name ?? 'System',
                'at'            => $e->created_at->format('d M H:i'),
                'metadata'      => $e->metadata,
            ]);

        $episodeTimelines = $appointment->episodes->map(fn($ep) => $ep->getTimeline());

        return [
            'billing_model'     => $appointment->billing_model ?? Appointment::BILLING_TREATMENT,
            'service_invoice'   => $serviceInv
                ? $serviceInv->getBillingBreakdown()
                : null,
            'treatment_invoice' => $treatmentInv
                ? $treatmentInv->getBillingBreakdown()
                : null,
            'grand_total'       => (float) ($serviceInv?->total ?? 0) + (float) ($treatmentInv?->total ?? 0),
            'total_paid'        => (float) ($serviceInv?->paid ?? 0) + (float) ($treatmentInv?->paid ?? 0),
            'outstanding'       => (float) ($serviceInv?->balance ?? 0) + (float) ($treatmentInv?->balance ?? 0),
            'episodes'          => $episodeTimelines,
            'billing_events'    => $events,
        ];
    }
}

<?php

namespace App\Listeners;

use App\Events\EpisodeFinalized;
use App\Events\InvoiceLocked;
use App\Events\PaymentRecorded;
use App\Events\ProcedureAdded;
use App\Events\ProcedureRemoved;
use App\Models\BillingEvent;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

/**
 * LogBillingEvent — single listener that handles all billing events.
 * Each method maps to one Event class.
 */
class LogBillingEvent
{
    public function handleProcedureAdded(ProcedureAdded $event): void
    {
        try {
            BillingEvent::log(
                $event->invoice,
                BillingEvent::EVENT_PROCEDURE_ADDED,
                $event->amountImpact,
                (float) $event->invoice->total,
                [
                    'procedure_id'  => $event->procedure->id,
                    'procedure_name'=> $event->procedure->name,
                    'episode_id'    => $event->episode->id,
                ],
                $event->addedBy->id,
                $event->episode->appointment_id,
                $event->episode->id
            );
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] handleProcedureAdded: ' . $e->getMessage());
        }
    }

    public function handleProcedureRemoved(ProcedureRemoved $event): void
    {
        try {
            BillingEvent::log(
                $event->invoice,
                BillingEvent::EVENT_PROCEDURE_REMOVED,
                -$event->amountRemoved,
                (float) $event->invoice->fresh()->total,
                ['procedure_id' => $event->procedure->id],
                $event->removedBy->id,
                $event->invoice->appointment_id
            );
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] handleProcedureRemoved: ' . $e->getMessage());
        }
    }

    public function handleEpisodeFinalized(EpisodeFinalized $event): void
    {
        try {
            BillingEvent::log(
                $event->invoice,
                BillingEvent::EVENT_EPISODE_FINALIZED,
                0,
                (float) $event->invoice->total,
                [
                    'episode_id'  => $event->episode->id,
                    'phase'       => $event->episode->phase_number,
                    'finalized_by'=> $event->finalizedBy->name,
                ],
                $event->finalizedBy->id,
                $event->appointment->id,
                $event->episode->id
            );

            // Notify accountants that invoice is ready for review
            $this->notifyAccountantsForReview($event->invoice, $event->finalizedBy);
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] handleEpisodeFinalized: ' . $e->getMessage());
        }
    }

    public function handleInvoiceLocked(InvoiceLocked $event): void
    {
        try {
            BillingEvent::log(
                $event->invoice,
                BillingEvent::EVENT_INVOICE_LOCKED,
                0,
                (float) $event->invoice->total,
                ['locked_by' => $event->lockedBy->name],
                $event->lockedBy->id,
                $event->invoice->appointment_id
            );
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] handleInvoiceLocked: ' . $e->getMessage());
        }
    }

    public function handlePaymentRecorded(PaymentRecorded $event): void
    {
        try {
            $eventType = $event->isPrePayment
                ? BillingEvent::EVENT_PREPAYMENT_RECORDED
                : BillingEvent::EVENT_PAYMENT_RECORDED;

            BillingEvent::log(
                $event->invoice,
                $eventType,
                (float) $event->payment->amount,
                (float) $event->invoice->fresh()->total,
                [
                    'payment_id' => $event->payment->id,
                    'method'     => $event->payment->method,
                    'reference'  => $event->payment->reference,
                ],
                $event->collectedBy->id,
                $event->invoice->appointment_id
            );
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] handlePaymentRecorded: ' . $e->getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function notifyAccountantsForReview(\App\Models\Invoice $invoice, \App\Models\User $dentist): void
    {
        try {
            \App\Models\User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get()
                ->each(function ($accountant) use ($invoice, $dentist) {
                    $accountant->notify(new \App\Notifications\InvoiceReadyForReviewNotification(
                        $invoice,
                        $dentist->name
                    ));
                });
        } catch (\Throwable $e) {
            Log::error('[BillingEvent] notifyAccountantsForReview: ' . $e->getMessage());
        }
    }
}

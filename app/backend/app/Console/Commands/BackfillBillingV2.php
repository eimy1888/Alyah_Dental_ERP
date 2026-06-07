<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\TreatmentEpisode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * BackfillBillingV2 — zero-risk backfill for existing data.
 *
 * Run ONCE after deploying billing v2 migrations:
 *   php artisan billing:backfill
 *
 * What it does:
 *   1. Sets billing_model = 'treatment' for all existing appointments
 *   2. Links appointment.treatment_invoice_id to existing invoice
 *   3. Sets invoice_type on all existing invoices (card → card, else → treatment)
 *   4. Sets lifecycle_status on all invoices based on current status
 *   5. Creates a TreatmentEpisode for every appointment that has an invoice
 *      but no episode yet (so existing data works with new episode-based queries)
 */
class BackfillBillingV2 extends Command
{
    protected $signature   = 'billing:backfill {--dry-run : Show what would be changed without writing}';
    protected $description = 'Backfill billing v2 fields for existing appointments and invoices';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $this->info($dry ? '=== DRY RUN — no changes will be written ===' : '=== Running Billing v2 Backfill ===');

        $this->backfillInvoices($dry);
        $this->backfillAppointments($dry);
        $this->backfillEpisodes($dry);

        $this->info('');
        $this->info($dry ? 'Dry run complete. Run without --dry-run to apply.' : '✅ Billing v2 backfill complete.');

        return self::SUCCESS;
    }

    // ── Step 1: Set invoice_type and lifecycle_status ─────────────────────────

    private function backfillInvoices(bool $dry): void
    {
        $this->info('');
        $this->info('Step 1: Backfilling invoices...');

        $invoices = Invoice::whereNull('invoice_type')
            ->orWhereNull('lifecycle_status')
            ->get();

        $this->info("  Found {$invoices->count()} invoices to backfill.");

        $invoices->each(function (Invoice $invoice) use ($dry) {
            // Determine type
            $isCard = $invoice->items()
                ->where('description', 'like', '%Clinic Card%')
                ->exists();

            $invoiceType = $isCard ? 'card' : 'treatment';

            // Map legacy status → lifecycle_status
            $lifecycleStatus = match ($invoice->status) {
                'paid'     => Invoice::STATUS_PAID,
                'partial'  => Invoice::STATUS_PARTIAL,
                'overdue'  => Invoice::STATUS_OVERDUE,
                'cancelled'=> Invoice::STATUS_CANCELLED,
                'draft'    => Invoice::STATUS_DRAFT,
                default    => Invoice::STATUS_IN_PROGRESS,  // sent → in_progress (dentist still building)
            };

            // If appointment is completed, mark invoice as final (not in_progress)
            if ($lifecycleStatus === Invoice::STATUS_IN_PROGRESS && $invoice->appointment_id) {
                $apptStatus = DB::table('appointments')
                    ->where('id', $invoice->appointment_id)
                    ->value('status');

                if (in_array($apptStatus, ['completed'])) {
                    $lifecycleStatus = Invoice::STATUS_FINAL;
                }
            }

            $this->line("  Invoice #{$invoice->id}: type={$invoiceType}, lifecycle={$lifecycleStatus}");

            if (!$dry) {
                $invoice->update([
                    'invoice_type'     => $invoiceType,
                    'lifecycle_status' => $lifecycleStatus,
                    'pre_paid'         => $invoice->pre_paid ?? 0,
                    'estimated_total'  => $invoice->estimated_total ?? $invoice->total,
                    'tax_rate'         => $invoice->tax_rate ?? 15,
                ]);
            }
        });
    }

    // ── Step 2: Link appointments to invoices ─────────────────────────────────

    private function backfillAppointments(bool $dry): void
    {
        $this->info('');
        $this->info('Step 2: Backfilling appointments...');

        // Appointments that have an invoice but no treatment_invoice_id set
        $appointments = Appointment::whereNull('billing_model')
            ->orWhereNull('treatment_invoice_id')
            ->get();

        $this->info("  Found {$appointments->count()} appointments to backfill.");

        $appointments->each(function (Appointment $appointment) use ($dry) {
            // Find existing invoice (old single-invoice pattern)
            $invoice = Invoice::where('appointment_id', $appointment->id)
                ->where(function ($q) {
                    $q->where('invoice_type', 'treatment')
                      ->orWhereNull('invoice_type');
                })
                ->first();

            $updates = [
                'billing_model' => Appointment::BILLING_TREATMENT,
            ];

            if ($invoice && !$appointment->treatment_invoice_id) {
                $updates['treatment_invoice_id'] = $invoice->id;
            }

            $this->line("  Appointment #{$appointment->id}: billing_model=treatment, treatment_invoice_id={$invoice?->id}");

            if (!$dry) {
                $appointment->update($updates);
            }
        });
    }

    // ── Step 3: Create missing TreatmentEpisodes ──────────────────────────────

    private function backfillEpisodes(bool $dry): void
    {
        $this->info('');
        $this->info('Step 3: Creating missing TreatmentEpisodes...');

        // Appointments that have a treatment invoice but no episode
        $appointments = Appointment::whereNotNull('treatment_invoice_id')
            ->whereDoesntHave('episodes')
            ->with('treatmentInvoice')
            ->get();

        $this->info("  Found {$appointments->count()} appointments needing an episode.");

        $appointments->each(function (Appointment $appointment) use ($dry) {
            $this->line("  Creating episode for Appointment #{$appointment->id}");

            if (!$dry) {
                $episode = TreatmentEpisode::create([
                    'clinic_id'      => $appointment->clinic_id,
                    'branch_id'      => $appointment->branch_id,
                    'appointment_id' => $appointment->id,
                    'patient_id'     => $appointment->patient_id,
                    'dentist_id'     => $appointment->dentist_id,
                    'episode_type'   => TreatmentEpisode::TYPE_TREATMENT,
                    'status'         => in_array($appointment->status, ['completed'])
                        ? TreatmentEpisode::STATUS_BILLED
                        : TreatmentEpisode::STATUS_OPEN,
                    'phase_number'   => 1,
                    'title'          => 'Episode 1',
                    'invoice_id'     => $appointment->treatment_invoice_id,
                    'opened_at'      => $appointment->created_at,
                    'finalized_at'   => in_array($appointment->status, ['completed'])
                        ? $appointment->end_time ?? $appointment->updated_at
                        : null,
                ]);

                // Update invoice to link to episode
                if ($appointment->treatmentInvoice) {
                    $appointment->treatmentInvoice->update([
                        'treatment_episode_id' => $episode->id,
                    ]);
                }

                // Link all procedures to this episode
                \App\Models\Procedure::where('appointment_id', $appointment->id)
                    ->whereNull('treatment_episode_id')
                    ->update(['treatment_episode_id' => $episode->id]);
            }
        });
    }
}

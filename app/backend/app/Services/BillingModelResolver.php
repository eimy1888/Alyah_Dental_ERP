<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BillingEvent;
use App\Models\Invoice;
use App\Models\Service;
use App\Models\TreatmentEpisode;
use App\Models\User;

/**
 * BillingModelResolver — called once at booking time.
 *
 * Reads the billing_model from the service (or request override)
 * and creates the correct invoices + treatment episode(s).
 *
 * service   → one fixed service invoice (estimated)
 * treatment → one empty treatment invoice + one episode (in_progress)
 * hybrid    → both: fixed service invoice + empty treatment invoice + episode
 */
class BillingModelResolver
{
    public function resolveAtBooking(Appointment $appointment, User $bookedBy): void
    {
        $service = $appointment->service_id
            ? Service::find($appointment->service_id)
            : null;

        // Determine model: explicit on appointment > service default > fallback treatment
        $model = $appointment->billing_model
            ?? $service?->billing_model
            ?? Appointment::BILLING_TREATMENT;

        $appointment->update(['billing_model' => $model]);

        match ($model) {
            Appointment::BILLING_SERVICE   => $this->handleService($appointment, $service, $bookedBy),
            Appointment::BILLING_TREATMENT => $this->handleTreatment($appointment, $bookedBy),
            Appointment::BILLING_HYBRID    => $this->handleHybrid($appointment, $service, $bookedBy),
            default                        => $this->handleTreatment($appointment, $bookedBy),
        };
    }

    // ── Service billing: fixed invoice created immediately ────────────────────

    private function handleService(Appointment $appointment, ?Service $service, User $bookedBy): void
    {
        if (!$service) {
            // No service selected — fall back to treatment
            $this->handleTreatment($appointment, $bookedBy);
            return;
        }

        $invoice = Invoice::createServiceInvoice($appointment, $service, $bookedBy);
        $appointment->update(['service_invoice_id' => $invoice->id]);
    }

    // ── Treatment billing: empty invoice + episode created ────────────────────

    private function handleTreatment(Appointment $appointment, User $bookedBy): void
    {
        // Open episode for this dentist
        $episode = $this->openEpisode($appointment, $bookedBy, TreatmentEpisode::TYPE_TREATMENT);

        // Create treatment invoice linked to episode
        $invoice = Invoice::createTreatmentInvoice($appointment, $bookedBy, $episode);

        // Link invoice to episode
        $episode->update(['invoice_id' => $invoice->id]);

        $appointment->update(['treatment_invoice_id' => $invoice->id]);

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_EPISODE_OPENED,
            0,
            0,
            ['episode_id' => $episode->id, 'phase' => $episode->phase_number],
            $bookedBy->id,
            $appointment->id,
            $episode->id
        );
    }

    // ── Hybrid billing: fixed service invoice + treatment invoice + episode ───

    private function handleHybrid(Appointment $appointment, ?Service $service, User $bookedBy): void
    {
        // Fixed service invoice
        if ($service) {
            $serviceInvoice = Invoice::createServiceInvoice($appointment, $service, $bookedBy);
            $appointment->update(['service_invoice_id' => $serviceInvoice->id]);
        }

        // Episode + treatment invoice
        $episode = $this->openEpisode($appointment, $bookedBy, TreatmentEpisode::TYPE_HYBRID);
        $treatmentInvoice = Invoice::createTreatmentInvoice($appointment, $bookedBy, $episode);
        $episode->update(['invoice_id' => $treatmentInvoice->id]);
        $appointment->update(['treatment_invoice_id' => $treatmentInvoice->id]);

        BillingEvent::log(
            $treatmentInvoice,
            BillingEvent::EVENT_EPISODE_OPENED,
            0,
            0,
            ['episode_id' => $episode->id, 'model' => 'hybrid'],
            $bookedBy->id,
            $appointment->id,
            $episode->id
        );
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function openEpisode(Appointment $appointment, User $bookedBy, string $type): TreatmentEpisode
    {
        // Count existing phases for this appointment
        $phaseCount = TreatmentEpisode::where('appointment_id', $appointment->id)->count();

        return TreatmentEpisode::create([
            'clinic_id'      => $appointment->clinic_id,
            'branch_id'      => $appointment->branch_id,
            'appointment_id' => $appointment->id,
            'patient_id'     => $appointment->patient_id,
            'dentist_id'     => $appointment->dentist_id,
            'episode_type'   => $type,
            'status'         => TreatmentEpisode::STATUS_OPEN,
            'phase_number'   => $phaseCount + 1,
            'title'          => "Episode " . ($phaseCount + 1),
            'opened_at'      => now(),
        ]);
    }
}

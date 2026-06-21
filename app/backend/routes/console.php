<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\CheckNoShowAppointments;
use App\Jobs\CheckEmergencyWaitingTime;
use App\Services\NotificationService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── 1. No-Show Detection (every 5 minutes) ────────────────────────────────────
Schedule::call(function () {
    $cutoff = now()->subMinutes(30);

    $appointments = \App\Models\Appointment::where('status', 'confirmed')
        ->where('appointment_time', '<', $cutoff)
        ->whereNull('check_in_time')
        ->with('patient')
        ->get();

    foreach ($appointments as $appointment) {
        $appointment->update(['status' => 'no_show']);

        if ($appointment->patient) {
            $patient  = $appointment->patient;
            $newCount = $patient->no_show_count + 1;
            $patient->update([
                'no_show_count'    => $newCount,
                'requires_deposit' => $newCount >= 3,
                'last_no_show_at'  => now(),
            ]);

            \Illuminate\Support\Facades\Log::info('No-show auto-detected', [
                'appointment_id' => $appointment->id,
                'patient_id'     => $patient->id,
                'patient_name'   => $patient->full_name,
                'no_show_count'  => $newCount,
            ]);
        }
    }
})->everyFiveMinutes()->name('appointments:detect-no-shows');

// ── 2. No-Show Job (every minute, dedicated job) ──────────────────────────────
Schedule::job(new CheckNoShowAppointments)->everyMinute();

// ── 3. Emergency Waiting Time Alert (every minute) ───────────────────────────
Schedule::job(new CheckEmergencyWaitingTime)->everyMinute();

// ── 4. Auto-restore dentist availability (hourly) ─────────────────────────────
Schedule::call(function () {
    \App\Models\Staff::where('is_available', false)
        ->whereNotNull('unavailable_until')
        ->where('unavailable_until', '<=', now())
        ->update([
            'is_available'       => true,
            'unavailable_reason' => null,
            'unavailable_until'  => null,
        ]);
})->hourly()->name('staff:restore-availability');

// ── 5. Subscription Expiry + Suspension (every hour) ─────────────────────────
Schedule::call(function () {

    // 5a. Expire active paid subscriptions
    $expiredSubs = \App\Models\Subscription::where('status', 'active')
        ->where('ends_at', '<=', now())
        ->with('clinic.branches', 'plan')
        ->get();

    foreach ($expiredSubs as $subscription) {
        try {
            $subscription->update(['status' => 'expired']);
            $clinic = $subscription->clinic;
            if (!$clinic) continue;

            $clinic->update(['status' => 'suspended', 'subdomain_active' => false]);
            $clinic->branches()->update(['subdomain_active' => false]);
            $clinic->users()->update(['is_active' => false]);

            // Notify clinic admin via DB + email
            NotificationService::subscriptionExpired($subscription);

            \Illuminate\Support\Facades\Log::info('[DentFlow] Subscription auto-expired', [
                'clinic_id'       => $clinic->id,
                'clinic_name'     => $clinic->name,
                'subscription_id' => $subscription->id,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[DentFlow] Subscription expiry failed', [
                'subscription_id' => $subscription->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }

    // 5b. Expire free trials
    $expiredTrials = \App\Models\Subscription::where('status', 'trialing')
        ->where('billing_cycle', 'trial')
        ->where('ends_at', '<=', now())
        ->with('clinic.branches', 'plan')
        ->get();

    foreach ($expiredTrials as $subscription) {
        try {
            $subscription->update(['status' => 'expired']);
            $clinic = $subscription->clinic;
            if (!$clinic) continue;

            $clinic->update(['status' => 'suspended', 'subdomain_active' => false]);
            $clinic->branches()->update(['subdomain_active' => false]);
            $clinic->users()->update(['is_active' => false]);

            NotificationService::subscriptionExpired($subscription);

            \Illuminate\Support\Facades\Log::info('[DentFlow] Free trial expired — clinic suspended', [
                'clinic_id'   => $clinic->id,
                'clinic_name' => $clinic->name,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[DentFlow] Trial expiry failed', [
                'subscription_id' => $subscription->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }

})->hourly()->name('subscriptions:expire');

// ── 6. Subscription Expiry Warnings (daily at 09:00 EAT) ─────────────────────
// Sends warning at 7 days, 3 days, and 1 day before expiry.
Schedule::call(function () {
    $warningDays = [7, 3, 1];

    foreach ($warningDays as $days) {
        $targetDate = now()->addDays($days)->toDateString();

        $subscriptions = \App\Models\Subscription::where('status', 'active')
            ->whereDate('ends_at', $targetDate)
            ->with(['clinic', 'plan'])
            ->get();

        foreach ($subscriptions as $subscription) {
            try {
                NotificationService::subscriptionExpiring($subscription, $days);

                \Illuminate\Support\Facades\Log::info("[DentFlow] Subscription expiry warning sent ({$days}d)", [
                    'clinic_id'       => $subscription->clinic_id,
                    'subscription_id' => $subscription->id,
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('[DentFlow] Expiry warning failed', [
                    'subscription_id' => $subscription->id,
                    'error'           => $e->getMessage(),
                ]);
            }
        }
    }
})->dailyAt('09:00')->timezone('Africa/Addis_Ababa')->name('subscriptions:expiry-warnings');

// ── 7. Recall Notifications (daily at 08:00 EAT) ─────────────────────────────
// Finds recalls due in exactly 7 days and sends DB + email reminders.
Schedule::call(function () {
    $targetDate = now()->addDays(7)->toDateString();

    $recalls = \App\Models\Recall::where('status', 'pending')
        ->where('notification_sent', false)
        ->whereDate('due_date', $targetDate)
        ->with(['patient.clinic', 'dentist'])
        ->get();

    foreach ($recalls as $recall) {
        try {
            // Send DB notification + email via NotificationService
            NotificationService::recallDue($recall);

            $recall->update([
                'notification_sent'    => true,
                'notification_sent_at' => now(),
                'status'               => 'notified',
            ]);

            \Illuminate\Support\Facades\Log::info('Recall notification sent', [
                'recall_id'   => $recall->id,
                'patient_id'  => $recall->patient_id,
                'due_date'    => $recall->due_date->toDateString(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[DentFlow] Recall notification failed', [
                'recall_id' => $recall->id,
                'error'     => $e->getMessage(),
            ]);
        }
    }
})->dailyAt('08:00')->timezone('Africa/Addis_Ababa')->name('recalls:send-notifications');

// ── 8. Invoice Auto-Lock (every hour) ─────────────────────────────────────────
// Locks invoices that have been PAID for 24+ hours (audit immutability).
Schedule::call(function () {
    $invoices = \App\Models\Invoice::where('lifecycle_status', \App\Models\Invoice::STATUS_PAID)
        ->whereNotNull('locked_at')
        ->where('locked_at', '<=', now())
        ->get();

    foreach ($invoices as $invoice) {
        try {
            // Find who locked it (finalized_by)
            $by = \App\Models\User::find($invoice->locked_by ?? $invoice->finalized_by);
            if ($by) {
                $invoice->lockForAudit($by);
                \Illuminate\Support\Facades\Log::info('[DentFlow] Invoice auto-locked', [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[DentFlow] Invoice auto-lock failed', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }
})->hourly()->name('invoices:auto-lock');

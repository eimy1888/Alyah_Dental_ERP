<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\CheckNoShowAppointments;
use App\Jobs\CheckEmergencyWaitingTime;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── Auto No-Show Detection ──────────────────────────────────────────
// Runs every 5 minutes. Finds confirmed appointments that passed
// 30+ minutes ago with no check-in, marks them as no_show,
// and increments the patient's no_show_count.
Schedule::call(function () {
    $cutoff = now()->subMinutes(30);

    $appointments = \App\Models\Appointment::where('status', 'confirmed')
        ->where('appointment_time', '<', $cutoff)
        ->whereNull('check_in_time')
        ->with('patient')
        ->get();

    foreach ($appointments as $appointment) {
        // Mark appointment as no_show
        $appointment->update(['status' => 'no_show']);

        // Increment patient's no_show_count
        if ($appointment->patient) {
            $patient = $appointment->patient;
            $newCount = $patient->no_show_count + 1;

            $patient->update([
                'no_show_count'    => $newCount,
                'requires_deposit' => $newCount >= 3, // Threshold: 3 no-shows
            ]);

            // Log the no-show
            \Illuminate\Support\Facades\Log::info("No-show auto-detected", [
                'appointment_id' => $appointment->id,
                'patient_id'     => $patient->id,
                'patient_name'   => $patient->full_name,
                'no_show_count'  => $newCount,
                'requires_deposit' => $newCount >= 3,
            ]);
        }
    }
})->everyFiveMinutes()->name('appointments:detect-no-shows');

// ── Recall Notification Sender ───────────────────────────────────────
// Runs daily. Finds recalls due in exactly 7 days that haven't been
// notified yet, and marks them as notified.
Schedule::call(function () {
    $recalls = \App\Models\Recall::where('status', 'pending')
        ->where('notification_sent', false)
        ->whereDate('due_date', '=', now()->addDays(7)->toDateString())
        ->with(['patient', 'dentist'])
        ->get();

    foreach ($recalls as $recall) {
        $recall->update([
            'notification_sent'    => true,
            'notification_sent_at' => now(),
            'status'               => 'notified',
        ]);

        \Illuminate\Support\Facades\Log::info('Recall notification triggered', [
            'recall_id'      => $recall->id,
            'patient_id'     => $recall->patient_id,
            'patient_name'   => $recall->patient?->full_name,
            'due_date'       => $recall->due_date->toDateString(),
            'dentist_name'   => $recall->dentist?->name,
        ]);
    }
})->dailyAt('08:00')->timezone('Africa/Addis_Ababa')->name('recalls:send-notifications');


// Check for no-show appointments every minute
Schedule::job(new CheckNoShowAppointments)->everyMinute();

// Check for emergencies waiting longer than threshold every minute
Schedule::job(new CheckEmergencyWaitingTime)->everyMinute();

// Auto-mark dentists as available when unavailable_until has passed (runs hourly)
Schedule::call(function () {
    \App\Models\Staff::where('is_available', false)
        ->whereNotNull('unavailable_until')
        ->where('unavailable_until', '<=', now())
        ->update([
            'is_available' => true,
            'unavailable_reason' => null,
            'unavailable_until' => null,
        ]);
})->hourly();

// ── Auto Subscription Expiry ──────────────────────────────────────────────────
// Runs every hour. Finds active subscriptions whose ends_at has passed,
// marks them expired, disables clinic + branch subdomain access,
// deactivates all clinic users, and suspends the clinic.
Schedule::call(function () {
    $expiredSubs = \App\Models\Subscription::where('status', 'active')
        ->where('ends_at', '<=', now())
        ->with('clinic.branches')
        ->get();

    foreach ($expiredSubs as $subscription) {
        try {
            // 1. Mark subscription as expired
            $subscription->update(['status' => 'expired']);

            $clinic = $subscription->clinic;
            if (!$clinic) continue;

            // 2. Disable clinic subdomain + suspend clinic
            $clinic->update([
                'status'           => 'suspended',
                'subdomain_active' => false,
            ]);

            // 3. Disable all branch subdomains
            if ($clinic->branches) {
                $clinic->branches()->update(['subdomain_active' => false]);
            }

            // 4. Deactivate all clinic users
            $clinic->users()->update(['is_active' => false]);

            \Illuminate\Support\Facades\Log::info('[DentFlow] Subscription auto-expired', [
                'clinic_id'       => $clinic->id,
                'clinic_name'     => $clinic->name,
                'subscription_id' => $subscription->id,
                'ended_at'        => $subscription->ends_at->toDateTimeString(),
                'expired_at'      => now()->toDateTimeString(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[DentFlow] Subscription expiry failed', [
                'subscription_id' => $subscription->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }
})->hourly()->name('subscriptions:expire');
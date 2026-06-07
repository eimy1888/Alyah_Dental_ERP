<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\User;
use App\Notifications\AppointmentBookedNotification;
use App\Notifications\AppointmentConfirmedNotification;
use App\Notifications\InvoiceCreatedNotification;
use Illuminate\Support\Facades\Log;

/**
 * Static helper — called from controllers after successful DB writes.
 * All notification dispatches are wrapped in try/catch so a notification
 * failure never breaks the main response.
 */
class NotificationService
{
    /**
     * Called after receptionist OR manager books an appointment.
     * Notifies: branch_manager(s) of that branch + (dentist via is_notified flag — already handled).
     */
    public static function appointmentBooked(Appointment $appointment, User $bookedBy): void
    {
        try {
            $appointment->loadMissing(['patient', 'dentist']);

            $notification = new AppointmentBookedNotification(
                $appointment,
                $bookedBy->name,
                $bookedBy->role,
            );

            // Notify branch managers of the same branch
            $managers = User::where('clinic_id', $appointment->clinic_id)
                ->where('branch_id', $appointment->branch_id)
                ->where('role', 'branch_manager')
                ->where('is_active', true)
                ->get();

            foreach ($managers as $manager) {
                $manager->notify($notification);
            }
        } catch (\Throwable $e) {
            Log::error('[NotificationService] appointmentBooked failed: ' . $e->getMessage());
        }
    }

    /**
     * Called after appointment status changes to 'confirmed'.
     * Notifies: the patient User linked to the appointment's patient record.
     */
    public static function appointmentConfirmed(Appointment $appointment): void
    {
        try {
            $appointment->loadMissing(['patient', 'dentist']);

            $patientUser = self::findPatientUser($appointment);
            if (!$patientUser) return;

            $patientUser->notify(new AppointmentConfirmedNotification($appointment));
        } catch (\Throwable $e) {
            Log::error('[NotificationService] appointmentConfirmed failed: ' . $e->getMessage());
        }
    }

    /**
     * Called after receptionist creates an invoice.
     * Notifies: accountant(s) of the clinic + patient user.
     */
    public static function invoiceCreated(Invoice $invoice, User $createdBy): void
    {
        try {
            $invoice->loadMissing(['patient']);

            $notification = new InvoiceCreatedNotification($invoice, $createdBy->name);

            // Notify all active accountants in this clinic
            $accountants = User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get();

            foreach ($accountants as $accountant) {
                $accountant->notify($notification);
            }

            // Notify the patient user
            $patientUser = User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'patient')
                ->whereHas('patient', fn($q) => $q->where('id', $invoice->patient_id))
                ->first();

            if ($patientUser) {
                $patientUser->notify(new InvoiceCreatedNotification($invoice, $createdBy->name));
            }
        } catch (\Throwable $e) {
            Log::error('[NotificationService] invoiceCreated failed: ' . $e->getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Find the User record for a patient (role = 'patient') by matching
     * against the Patient model's email/phone, or via patient.user_id if set.
     */
    private static function findPatientUser(Appointment $appointment): ?User
    {
        $patient = $appointment->patient;
        if (!$patient) return null;

        // If patient has a direct user_id link
        if (!empty($patient->user_id)) {
            return User::find($patient->user_id);
        }

        // Fall back: match by email or phone within the same clinic
        return User::where('clinic_id', $appointment->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })
            ->first();
    }
}
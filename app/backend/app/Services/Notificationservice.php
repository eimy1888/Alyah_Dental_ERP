<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\TreatmentPlan;
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

    /**
     * Called after GP creates a treatment plan.
     * Notifies: accountant(s) that estimate invoice is ready for review + patient.
     */
    public static function treatmentPlanCreated(TreatmentPlan $plan, Appointment $appointment, User $gp): void
    {
        try {
            $plan->loadMissing(['patient', 'estimateInvoice']);

            // Notify all active accountants
            $accountants = User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get();

            $patientName = $plan->patient?->full_name ?? 'Patient';
            $invoiceNum  = $plan->estimateInvoice?->invoice_number ?? '—';
            $total       = number_format((float) ($plan->estimateInvoice?->total ?? 0), 2);

            foreach ($accountants as $accountant) {
                \DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'treatment_estimate_ready',
                    'notifiable_type' => User::class,
                    'notifiable_id'   => $accountant->id,
                    'data'            => json_encode([
                        'title'      => 'Treatment Estimate Pending Review',
                        'message'    => "Dr. {$gp->name} submitted estimate {$invoiceNum} for {$patientName}. Total: ETB {$total}.",
                        'plan_id'    => $plan->id,
                        'invoice_id' => $plan->estimate_invoice_id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Notify patient
            $patientUser = self::findPatientUserByPlan($plan);
            if ($patientUser) {
                \DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'treatment_plan_created',
                    'notifiable_type' => User::class,
                    'notifiable_id'   => $patientUser->id,
                    'data'            => json_encode([
                        'title'   => 'Your Treatment Plan is Ready',
                        'message' => "Dr. {$gp->name} has created a treatment plan for you. Estimated cost: ETB {$total}.",
                        'plan_id' => $plan->id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[NotificationService] treatmentPlanCreated failed: ' . $e->getMessage());
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

        if (!empty($patient->user_id)) {
            return User::find($patient->user_id);
        }

        return User::where('clinic_id', $appointment->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })
            ->first();
    }

    private static function findPatientUserByPlan(TreatmentPlan $plan): ?User
    {
        $patient = $plan->patient;
        if (!$patient) return null;

        if (!empty($patient->user_id)) {
            return User::find($patient->user_id);
        }

        return User::where('clinic_id', $plan->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })
            ->first();
    }
}
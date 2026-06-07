<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class NoShowService
{
    /**
     * Check for appointments that should be marked as no-show
     * Runs via scheduled job every minute
     *
     * @param int|null $clinicId Optional clinic ID to limit check
     * @return int Number of appointments marked as no-show
     */
    public function detectAndMarkNoShows(?int $clinicId = null): int
    {
        $query = Appointment::where('status', Appointment::STATUS_CONFIRMED)
            ->where('appointment_time', '<', now());

        if ($clinicId) {
            $query->where('clinic_id', $clinicId);
        }

        $appointments = $query->get();
        $count = 0;

        foreach ($appointments as $appointment) {
            if ($this->shouldBeNoShow($appointment)) {
                $this->markAsNoShow($appointment);
                $count++;
            }
        }

        return $count;
    }

    /**
     * Check if a specific appointment should be marked as no-show
     *
     * @param Appointment $appointment
     * @return bool
     */
    public function shouldBeNoShow(Appointment $appointment): bool
    {
        // Already processed
        if (in_array($appointment->status, [Appointment::STATUS_NO_SHOW, Appointment::STATUS_CANCELLED, Appointment::STATUS_COMPLETED])) {
            return false;
        }

        // Has check-in? Not a no-show
        if ($appointment->check_in_time) {
            return false;
        }

        // Get no-show threshold from clinic settings
        $thresholdMinutes = $appointment->clinic?->getNoShowThreshold() ?? 10;

        // Calculate minutes past appointment time
        $minutesPast = now()->diffInMinutes($appointment->appointment_time, false);

        // If negative (future appointment), not a no-show
        if ($minutesPast < 0) {
            return false;
        }

        // Mark as no-show if past threshold
        return $minutesPast >= $thresholdMinutes;
    }

    /**
     * Mark appointment as no-show and update patient record
     *
     * @param Appointment $appointment
     * @return void
     */
    public function markAsNoShow(Appointment $appointment): void
    {
        $appointment->markAsNoShow();

        Log::info("Appointment #{$appointment->id} marked as no-show", [
            'patient_id' => $appointment->patient_id,
            'dentist_id' => $appointment->dentist_id,
            'appointment_time' => $appointment->appointment_time,
        ]);
    }

    /**
     * Get patient's no-show statistics
     *
     * @param int $patientId
     * @param int $clinicId
     * @return array
     */
    public function getPatientNoShowStats(int $patientId, int $clinicId): array
    {
        $patient = \App\Models\Patient::where('clinic_id', $clinicId)
            ->find($patientId);

        if (!$patient) {
            return [
                'no_show_count' => 0,
                'requires_deposit' => false,
                'last_no_show_at' => null,
            ];
        }

        // Count no-shows from appointments (fallback if patient.no_show_count is not updated)
        $appointmentNoShows = Appointment::where('patient_id', $patientId)
            ->where('status', Appointment::STATUS_NO_SHOW)
            ->count();

        return [
            'no_show_count' => max($patient->no_show_count, $appointmentNoShows),
            'requires_deposit' => $patient->requiresDeposit() || $patient->no_show_count >= 3,
            'last_no_show_at' => $patient->last_no_show_at?->toDateTimeString(),
        ];
    }

    /**
     * Check if patient requires deposit before booking
     *
     * @param int $patientId
     * @param int $clinicId
     * @return bool
     */
    public function patientRequiresDeposit(int $patientId, int $clinicId): bool
    {
        $stats = $this->getPatientNoShowStats($patientId, $clinicId);
        return $stats['requires_deposit'];
    }
}
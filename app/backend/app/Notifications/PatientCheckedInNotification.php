<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the assigned dentist when their patient checks in.
 */
class PatientCheckedInNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Appointment $appointment,
        private readonly int         $queuePosition
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $patient  = $this->appointment->patient?->full_name ?? '—';
        $time     = $this->appointment->appointment_time->format('H:i');
        $isLate   = $this->appointment->is_late;
        $lateMin  = $this->appointment->late_minutes ?? 0;

        $lateNote = $isLate ? " ({$lateMin} min late)" : '';

        return [
            'type'           => 'patient_checked_in',
            'title'          => 'Patient Checked In',
            'message'        => "{$patient} has checked in{$lateNote}. Queue position: {$this->queuePosition}. Appointment at {$time}.",
            'appointment_id' => $this->appointment->id,
            'patient_name'   => $patient,
            'queue_position' => $this->queuePosition,
            'is_late'        => $isLate,
            'late_minutes'   => $lateMin,
        ];
    }
}

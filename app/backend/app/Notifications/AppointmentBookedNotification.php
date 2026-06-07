<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Fired when a receptionist or manager books an appointment.
 * Recipients: branch_manager of that branch, dentist assigned.
 *
 * Dentist notifications already use the is_notified flag on appointments,
 * so this notification targets branch_manager only. We keep it generic
 * so it can also be sent to dentist if needed in future.
 */
class AppointmentBookedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Appointment $appointment,
        private readonly string      $bookedByName,
        private readonly string      $bookedByRole,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $apt = $this->appointment;

        return [
            'type'             => 'appointment_booked',
            'title'            => 'New Appointment Booked',
            'message'          => sprintf(
                '%s booked an appointment for %s with Dr. %s on %s at %s.',
                $this->bookedByName,
                $apt->patient?->full_name  ?? 'a patient',
                $apt->dentist?->name       ?? 'a dentist',
                $apt->appointment_time->format('M d, Y'),
                $apt->appointment_time->format('H:i')
            ),
            'appointment_id'   => $apt->id,
            'patient_name'     => $apt->patient?->full_name  ?? '—',
            'dentist_name'     => $apt->dentist?->name       ?? '—',
            'appointment_time' => $apt->appointment_time->toDateTimeString(),
            'type_label'       => $apt->type,
            'status'           => $apt->status,
            'booked_by'        => $this->bookedByName,
            'booked_by_role'   => $this->bookedByRole,
            'branch_id'        => $apt->branch_id,
            'clinic_id'        => $apt->clinic_id,
        ];
    }
}
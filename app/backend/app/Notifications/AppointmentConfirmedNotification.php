<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Fired when an appointment status is set to 'confirmed'.
 * Recipient: the patient User linked to the appointment's patient record.
 */
class AppointmentConfirmedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Appointment $appointment,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $apt = $this->appointment;

        return [
            'type'             => 'appointment_confirmed',
            'title'            => 'Appointment Confirmed',
            'message'          => sprintf(
                'Your appointment with Dr. %s on %s at %s has been confirmed.',
                $apt->dentist?->name ?? 'your dentist',
                $apt->appointment_time->format('M d, Y'),
                $apt->appointment_time->format('H:i')
            ),
            'appointment_id'   => $apt->id,
            'dentist_name'     => $apt->dentist?->name ?? '—',
            'appointment_time' => $apt->appointment_time->toDateTimeString(),
            'type_label'       => $apt->type,
            'status'           => $apt->status,
            'branch_id'        => $apt->branch_id,
            'clinic_id'        => $apt->clinic_id,
        ];
    }
}
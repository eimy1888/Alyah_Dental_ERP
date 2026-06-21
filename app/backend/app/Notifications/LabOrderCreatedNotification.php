<?php

namespace App\Notifications;

use App\Models\LabOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to lab technician(s) when a dentist creates a new lab order.
 */
class LabOrderCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly LabOrder $labOrder) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $dentist  = $this->labOrder->orderingDentist?->name ?? '—';
        $patient  = $this->labOrder->patient?->full_name ?? '—';
        $type     = ucfirst($this->labOrder->order_type ?? 'Lab work');
        $dueDate  = $this->labOrder->expected_ready_date?->format('d M Y') ?? 'Not specified';

        return [
            'type'             => 'lab_order_created',
            'title'            => "New Lab Order — {$type}",
            'message'          => "Dr. {$dentist} ordered {$type} for {$patient}. Order #{$this->labOrder->lab_order_number}. Due: {$dueDate}.",
            'lab_order_id'     => $this->labOrder->id,
            'lab_order_number' => $this->labOrder->lab_order_number,
            'order_type'       => $this->labOrder->order_type,
            'patient_name'     => $patient,
            'dentist_name'     => $dentist,
            'due_date'         => $dueDate,
        ];
    }
}

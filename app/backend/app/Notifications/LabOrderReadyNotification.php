<?php

namespace App\Notifications;

use App\Models\LabOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to ordering dentist when lab order status changes to 'ready'.
 */
class LabOrderReadyNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly LabOrder $labOrder) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $patient  = $this->labOrder->patient?->full_name ?? '—';
        $type     = ucfirst($this->labOrder->order_type ?? 'Lab work');
        $readyDate = $this->labOrder->actual_ready_date?->format('d M Y') ?? 'today';

        return [
            'type'             => 'lab_order_ready',
            'title'            => "Lab Order Ready — {$type}",
            'message'          => "Lab order {$this->labOrder->lab_order_number} ({$type}) for {$patient} is ready as of {$readyDate}.",
            'lab_order_id'     => $this->labOrder->id,
            'lab_order_number' => $this->labOrder->lab_order_number,
            'order_type'       => $this->labOrder->order_type,
            'patient_name'     => $patient,
            'ready_date'       => $readyDate,
        ];
    }
}

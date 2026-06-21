<?php

namespace App\Notifications;

use App\Models\QueueItem;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to branch manager when an emergency patient has been waiting
 * longer than the clinic threshold.
 */
class EmergencyWaitingAlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly QueueItem $queueItem,
        private readonly int       $waitingMinutes,
        private readonly int       $thresholdMinutes
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $patient = $this->queueItem->patient?->full_name ?? 'Emergency patient';
        $dentist = $this->queueItem->dentist?->name ?? '—';

        return [
            'type'             => 'emergency_waiting_alert',
            'title'            => '🚨 Emergency Patient Waiting Too Long',
            'message'          => "{$patient} has been waiting {$this->waitingMinutes} minutes (threshold: {$this->thresholdMinutes} min). Please intervene.",
            'queue_item_id'    => $this->queueItem->id,
            'patient_name'     => $patient,
            'dentist_name'     => $dentist,
            'waiting_minutes'  => $this->waitingMinutes,
            'threshold_minutes'=> $this->thresholdMinutes,
        ];
    }
}

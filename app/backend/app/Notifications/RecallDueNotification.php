<?php

namespace App\Notifications;

use App\Models\Recall;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RecallDueNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Recall $recall) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dueDate    = $this->recall->due_date?->format('d M Y') ?? '—';
        $dentist    = $this->recall->dentist?->name ?? 'your dentist';
        $clinicName = $this->recall->patient?->clinic?->name ?? 'your dental clinic';

        return (new MailMessage)
            ->subject("🦷 Dental recall reminder — {$dueDate}")
            ->greeting("Hello, {$notifiable->name}!")
            ->line("It's time for your dental recall appointment at **{$clinicName}**.")
            ->line("**Recommended date:** {$dueDate}")
            ->line("**Your dentist:** Dr. {$dentist}")
            ->line('Please contact us to schedule your appointment at your earliest convenience.')
            ->line($this->recall->notes ? "**Note from your dentist:** {$this->recall->notes}" : '')
            ->salutation("— {$clinicName}");
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'       => 'recall_due',
            'title'      => 'Dental Recall Due',
            'message'    => "Your recall appointment is due on {$this->recall->due_date?->format('d M Y')}. Please contact us to schedule.",
            'recall_id'  => $this->recall->id,
            'due_date'   => $this->recall->due_date?->toDateString(),
            'dentist'    => $this->recall->dentist?->name ?? '—',
        ];
    }
}

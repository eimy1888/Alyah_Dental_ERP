<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionRenewedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Subscription $subscription) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $endsAt   = $this->subscription->ends_at?->format('d M Y') ?? '—';
        $planName = $this->subscription->plan?->name ?? 'Plan';

        return (new MailMessage)
            ->subject('✅ DentFlow subscription renewed successfully')
            ->greeting("Hello, {$notifiable->name}!")
            ->line("Your **{$planName}** subscription has been renewed successfully.")
            ->line("**Active until:** {$endsAt}")
            ->line('Your clinic continues to have full access to all features.')
            ->salutation('— The DentFlow Pro Team');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'            => 'subscription_renewed',
            'title'           => 'Subscription Renewed',
            'message'         => "Your {$this->subscription->plan?->name} plan has been renewed until {$this->subscription->ends_at?->format('d M Y')}.",
            'subscription_id' => $this->subscription->id,
            'ends_at'         => $this->subscription->ends_at?->toDateString(),
        ];
    }
}

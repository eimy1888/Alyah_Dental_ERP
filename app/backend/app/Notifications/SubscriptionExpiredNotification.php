<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiredNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Subscription $subscription) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('🔴 Your DentFlow subscription has expired')
            ->greeting("Hello, {$notifiable->name}!")
            ->line("Your **{$this->subscription->plan?->name}** subscription has expired and your clinic access has been suspended.")
            ->line('Please contact your platform administrator to renew your subscription and restore access.')
            ->action('Contact Support', 'mailto:' . config('app.saas_support_email', 'support@dentflowpro.com'))
            ->salutation('— The DentFlow Pro Team');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'            => 'subscription_expired',
            'title'           => 'Subscription Expired — Access Suspended',
            'message'         => "Your {$this->subscription->plan?->name} plan expired. Contact your administrator to renew.",
            'subscription_id' => $this->subscription->id,
            'expired_at'      => $this->subscription->ends_at?->toDateString(),
        ];
    }
}

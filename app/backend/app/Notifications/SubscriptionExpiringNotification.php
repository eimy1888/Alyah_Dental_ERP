<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to clinic_admin when subscription is expiring soon.
 * Channels: database + mail
 */
class SubscriptionExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Subscription $subscription,
        private readonly int          $daysRemaining
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $clinicName  = $notifiable->clinic?->name ?? 'Your Clinic';
        $planName    = $this->subscription->plan?->name ?? 'Current Plan';
        $endsAt      = $this->subscription->ends_at?->format('d M Y') ?? '—';
        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');

        return (new MailMessage)
            ->subject("⚠️ Your DentFlow subscription expires in {$this->daysRemaining} day(s)")
            ->greeting("Hello, {$notifiable->name}!")
            ->line("{$clinicName}'s **{$planName}** subscription expires on **{$endsAt}** ({$this->daysRemaining} day(s) remaining).")
            ->line('To avoid service interruption, please renew your subscription or contact your platform administrator.')
            ->action('Contact Support', "mailto:" . config('app.saas_support_email', 'support@dentflowpro.com'))
            ->line('If you have already renewed, please disregard this message.')
            ->salutation('— The DentFlow Pro Team');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'            => 'subscription_expiring',
            'title'           => "Subscription expiring in {$this->daysRemaining} day(s)",
            'message'         => "Your {$this->subscription->plan?->name} plan expires on {$this->subscription->ends_at?->format('d M Y')}. Renew to avoid interruption.",
            'subscription_id' => $this->subscription->id,
            'days_remaining'  => $this->daysRemaining,
            'ends_at'         => $this->subscription->ends_at?->toDateString(),
        ];
    }
}

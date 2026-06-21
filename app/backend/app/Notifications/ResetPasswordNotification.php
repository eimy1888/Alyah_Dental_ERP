<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Lang;

/**
 * Overrides Laravel's default reset password email with DentFlow branding.
 */
class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail(mixed $notifiable): MailMessage
    {
        $url = url(config('app.frontend_url', config('app.url')) . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->getEmailForPasswordReset()));

        return (new MailMessage)
            ->subject('Reset Your DentFlow Password')
            ->view('emails.password-reset', [
                'actionUrl' => $url,
                'count'     => config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60),
            ]);
    }
}

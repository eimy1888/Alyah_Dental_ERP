<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to patient after their invoice is fully paid.
 * Channels: database + mail
 */
class InvoicePaidNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Invoice $invoice) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $clinicName = $this->invoice->clinic?->name ?? 'DentFlow Clinic';
        $amount     = number_format((float) $this->invoice->total, 2);

        return (new MailMessage)
            ->subject("✅ Payment confirmed — {$this->invoice->invoice_number}")
            ->greeting("Hello, {$notifiable->name}!")
            ->line("Your payment of **ETB {$amount}** for invoice **{$this->invoice->invoice_number}** has been confirmed.")
            ->line("**Clinic:** {$clinicName}")
            ->line('Your treatment is now active. Please return to your dentist to continue.')
            ->line('Thank you for choosing us for your dental care.')
            ->salutation("— {$clinicName}");
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'invoice_paid',
            'title'          => 'Payment Confirmed',
            'message'        => "Invoice {$this->invoice->invoice_number} for ETB " . number_format((float)$this->invoice->total, 2) . " has been paid. Your treatment is now active.",
            'invoice_id'     => $this->invoice->id,
            'invoice_number' => $this->invoice->invoice_number,
            'total'          => (float) $this->invoice->total,
        ];
    }
}

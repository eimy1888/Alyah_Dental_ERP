<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Notifications\Notification;

class InvoiceReadyForReviewNotification extends Notification
{
    public function __construct(
        private readonly Invoice $invoice,
        private readonly string  $dentistName
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'type'             => 'invoice_ready_for_review',
            'invoice_id'       => $this->invoice->id,
            'invoice_number'   => $this->invoice->invoice_number,
            'patient_name'     => $this->invoice->patient?->full_name ?? '—',
            'total'            => (float) $this->invoice->total,
            'dentist_name'     => $this->dentistName,
            'message'          => "Invoice {$this->invoice->invoice_number} is ready for review (finalized by {$this->dentistName}).",
        ];
    }
}

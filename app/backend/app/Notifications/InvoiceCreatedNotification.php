<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Fired when a receptionist creates an invoice.
 * Recipients:
 *   - accountant(s) of the same clinic
 *   - patient User linked to the invoice patient record
 */
class InvoiceCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Invoice $invoice,
        private readonly string  $createdByName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $inv = $this->invoice;

        // Tailor message slightly based on recipient role
        $isPatient = $notifiable->role === 'patient';

        $title   = $isPatient ? 'New Invoice Issued' : 'New Invoice Created';
        $message = $isPatient
            ? sprintf(
                'Invoice %s for ETB %.2f has been issued for you.',
                $inv->invoice_number,
                (float) $inv->total
            )
            : sprintf(
                '%s created invoice %s for %s — ETB %.2f.',
                $this->createdByName,
                $inv->invoice_number,
                $inv->patient?->full_name ?? 'a patient',
                (float) $inv->total
            );

        return [
            'type'           => 'invoice_created',
            'title'          => $title,
            'message'        => $message,
            'invoice_id'     => $inv->id,
            'invoice_number' => $inv->invoice_number,
            'patient_name'   => $inv->patient?->full_name ?? '—',
            'total'          => (float) $inv->total,
            'balance'        => (float) $inv->balance,
            'status'         => $inv->status,
            'created_by'     => $this->createdByName,
            'branch_id'      => $inv->branch_id,
            'clinic_id'      => $inv->clinic_id,
        ];
    }
}
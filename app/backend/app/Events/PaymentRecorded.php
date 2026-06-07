<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentRecorded
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Payment $payment,
        public readonly Invoice $invoice,
        public readonly User    $collectedBy,
        public readonly bool    $isPrePayment = false
    ) {}
}

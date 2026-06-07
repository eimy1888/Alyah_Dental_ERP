<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\Procedure;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProcedureRemoved
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Procedure $procedure,
        public readonly Invoice   $invoice,
        public readonly float     $amountRemoved,
        public readonly User      $removedBy
    ) {}
}

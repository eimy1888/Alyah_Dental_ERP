<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\Procedure;
use App\Models\TreatmentEpisode;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProcedureAdded
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Procedure        $procedure,
        public readonly TreatmentEpisode $episode,
        public readonly Invoice          $invoice,
        public readonly float            $amountImpact,
        public readonly User             $addedBy
    ) {}
}

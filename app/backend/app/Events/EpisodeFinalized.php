<?php

namespace App\Events;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\TreatmentEpisode;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EpisodeFinalized
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly TreatmentEpisode $episode,
        public readonly Appointment      $appointment,
        public readonly Invoice          $invoice,
        public readonly User             $finalizedBy
    ) {}
}

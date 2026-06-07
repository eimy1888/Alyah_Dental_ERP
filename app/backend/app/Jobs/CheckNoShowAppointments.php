<?php

namespace App\Jobs;

use App\Services\NoShowService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckNoShowAppointments implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected ?int $clinicId;

    /**
     * Create a new job instance.
     *
     * @param int|null $clinicId
     */
    public function __construct(?int $clinicId = null)
    {
        $this->clinicId = $clinicId;
    }

    /**
     * Execute the job.
     */
    public function handle(NoShowService $noShowService): void
    {
        $count = $noShowService->detectAndMarkNoShows($this->clinicId);

        if ($count > 0) {
            Log::info('No-show detection completed', [
                'clinic_id' => $this->clinicId ?? 'all',
                'marked_count' => $count,
            ]);
        }
    }
}
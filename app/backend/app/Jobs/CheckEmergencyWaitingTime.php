<?php

namespace App\Jobs;

use App\Models\Clinic;
use App\Services\EmergencyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckEmergencyWaitingTime implements ShouldQueue
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
    public function handle(EmergencyService $emergencyService): void
    {
        $clinics = Clinic::query();

        if ($this->clinicId) {
            $clinics->where('id', $this->clinicId);
        }

        $clinics = $clinics->get();

        foreach ($clinics as $clinic) {
            $thresholdMinutes = $clinic->getEmergencyWaitThreshold();
            $emergencies = $emergencyService->checkWaitingEmergencies($clinic->id, $thresholdMinutes);

            if ($emergencies->isNotEmpty()) {
                foreach ($emergencies as $queueItem) {
                    $waitingMinutes = (int) now()->diffInMinutes($queueItem->created_at);

                    \App\Services\NotificationService::emergencyWaitingTooLong(
                        $queueItem,
                        $waitingMinutes,
                        $thresholdMinutes
                    );

                    Log::warning('Emergency waiting time exceeded', [
                        'clinic_id'         => $clinic->id,
                        'queue_item_id'     => $queueItem->id,
                        'patient_name'      => $queueItem->patient?->full_name,
                        'waiting_minutes'   => $waitingMinutes,
                        'threshold_minutes' => $thresholdMinutes,
                    ]);
                }
            }
        }
    }
}
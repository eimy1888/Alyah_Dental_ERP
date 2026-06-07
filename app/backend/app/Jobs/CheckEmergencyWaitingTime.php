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
                Log::warning('Emergency waiting time exceeded', [
                    'clinic_id' => $clinic->id,
                    'clinic_name' => $clinic->name,
                    'emergency_count' => $emergencies->count(),
                    'threshold_minutes' => $thresholdMinutes,
                    'emergencies' => $emergencies->map(function ($item) {
                        return [
                            'queue_item_id' => $item->id,
                            'patient_name' => $item->patient?->full_name,
                            'waiting_minutes' => now()->diffInMinutes($item->created_at),
                            'dentist_name' => $item->dentist?->name,
                        ];
                    }),
                ]);

                // TODO: Send notification to branch manager
                // This will be implemented when notification module is ready
            }
        }
    }
}
<?php

namespace App\Console\Commands;

use App\Models\Clinic;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SuspendExpiredTrials extends Command
{
    protected $signature   = 'trials:suspend-expired';
    protected $description = 'Suspend clinics whose 14-day free trial has expired.';

    public function handle(): int
    {
        // Find all trialing subscriptions that have passed their ends_at
        $expired = Subscription::where('status', 'trialing')
            ->where('billing_cycle', 'trial')
            ->where('ends_at', '<=', now())
            ->with('clinic')
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No expired trials found.');
            return self::SUCCESS;
        }

        $count = 0;

        foreach ($expired as $subscription) {
            $clinic = $subscription->clinic;

            if (! $clinic) {
                continue;
            }

            // Mark subscription as expired
            $subscription->update(['status' => 'expired']);

            // Suspend the clinic
            $clinic->update(['status' => 'suspended']);

            Log::info('[Alyah] Trial expired — clinic suspended', [
                'clinic_id'   => $clinic->id,
                'clinic_name' => $clinic->name,
                'trial_ended' => $subscription->ends_at->toDateString(),
            ]);

            $this->line("  Suspended: {$clinic->name} (trial ended {$subscription->ends_at->toDateString()})");
            $count++;
        }

        $this->info("Done. {$count} clinic(s) suspended.");

        return self::SUCCESS;
    }
}

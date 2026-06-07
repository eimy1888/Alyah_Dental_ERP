<?php

namespace App\Services\Landing;

use App\Models\Clinic;
use App\Models\Subscription;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MockPaymentService
{
    /**
     * Simulate a payment for a clinic's pending subscription.
     *
     * In production, this would be replaced by a real gateway webhook handler
     * (e.g., Chapa's callback, Telebirr's callback, PayPal IPN).
     *
     * Flow:
     *   1. Find the clinic's pending subscription.
     *   2. Generate a mock transaction reference.
     *   3. Mark subscription as active, set start/end dates.
     *   4. Move clinic to pending_platform_approval (manual review needed).
     *   5. Notify platform admin (mocked via log).
     *
     * @param  array $data  Validated data from MockPaymentRequest
     * @return array        ['clinic' => Clinic, 'subscription' => Subscription]
     *
     * @throws \Exception   If no pending subscription found or clinic not in correct state
     */
    public function processPayment(array $data): array
    {
        $clinic = Clinic::with(['subscriptions' => function ($q) {
            $q->where('status', 'pending')->latest();
        }, 'plan'])->findOrFail($data['clinic_id']);

        // Guard: clinic must still be in pending_payment state
        if ($clinic->status !== 'pending_payment') {
            throw new \Exception(
                "Clinic is not awaiting payment. Current status: {$clinic->status}"
            );
        }

        $subscription = $clinic->subscriptions->first();

        if (! $subscription) {
            throw new \Exception('No pending subscription found for this clinic.');
        }

        return DB::transaction(function () use ($clinic, $subscription, $data) {

            $startsAt = Carbon::now();
            $endsAt   = Subscription::calculateEndsAt($subscription->billing_cycle, $startsAt);

            // Determine amount from plan
            $amount = $subscription->billing_cycle === 'annual'
                ? $subscription->plan->annual_price
                : $subscription->plan->monthly_price;

            // Mock transaction reference
            $reference = $data['transaction_id']
                ?? strtoupper('MOCK-' . $data['payment_method'] . '-' . Str::random(10));

            // 1. Activate the subscription record
            $subscription->update([
                'status'            => 'active',
                'amount_paid'       => $amount,
                'payment_reference' => $reference,
                'starts_at'         => $startsAt,
                'ends_at'           => $endsAt,
            ]);

            // 2. Move clinic to pending platform approval
            $clinic->update([
                'status'               => 'pending_platform_approval',
                'subscription_ends_at' => $endsAt,
            ]);

            // 3. Log mock payment (replace with real notification later)
            Log::info('[Aylah] Mock payment received', [
                'clinic'     => $clinic->name,
                'method'     => $data['payment_method'],
                'reference'  => $reference,
                'amount'     => $amount,
                'cycle'      => $subscription->billing_cycle,
                'ends_at'    => $endsAt->toDateString(),
            ]);

            // 4. Notify platform admin (mock)
            Log::info('[Aylah] ACTION REQUIRED: Clinic pending approval', [
                'clinic_id' => $clinic->id,
                'clinic'    => $clinic->name,
                'email'     => $clinic->email,
            ]);

            return [
                'clinic'       => $clinic->fresh(['plan', 'activeSubscription']),
                'subscription' => $subscription->fresh(),
                'reference'    => $reference,
                'amount'       => $amount,
            ];
        });
    }
}
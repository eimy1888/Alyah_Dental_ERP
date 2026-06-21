<?php

namespace App\Services\Landing;

use App\Models\Clinic;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class ClinicRegistrationService
{
    /**
     * Register a new clinic with its admin user and a pending subscription.
     * This is Step 1 — clinic is created but NOT yet active (payment not done).
     *
     * @param  array $data  Validated data from RegisterClinicRequest
     * @return array        ['clinic' => Clinic, 'user' => User, 'subscription' => Subscription]
     */
    public function register(array $data): array
    {
        return DB::transaction(function () use ($data) {

            // 1. Resolve the plan
            $plan   = Plan::findOrFail($data['plan_id']);
            $isFree = $plan->isFree();

            // 2. Create the clinic
            $clinicStatus = $isFree ? 'pending_platform_approval' : 'pending_payment';

            $clinic = Clinic::create([
                'name'    => $data['clinic_name'],
                'email'   => $data['clinic_email'],
                'phone'   => $data['clinic_phone'],
                'address' => $data['clinic_address'] ?? null,
                'city'    => $data['clinic_city'] ?? null,
                'country' => $data['clinic_country'] ?? 'Ethiopia',
                'plan_id' => $data['plan_id'],
                'status'  => $clinicStatus,
                'settings' => [
                    'invoice_prefix'        => 'INV',
                    'theme'                 => 'default',
                    'notifications_enabled' => true,
                ],
                'subdomain' => Clinic::generateSubdomain($data['clinic_name']),
            ]);

            // 3. Create the clinic admin user
            $user = User::create([
                'clinic_id' => $clinic->id,
                'name'      => $data['admin_name'],
                'email'     => $data['admin_email'],
                'phone'     => $data['admin_phone'] ?? null,
                'password'  => Hash::make($data['admin_password']),
                'role'      => 'clinic_admin',
                'is_active' => false, // inactive until platform approves
            ]);

            // 4. Create subscription
            $TRIAL_DAYS = 14;

            if ($isFree) {
                // Free plan → 14-day trial, activate immediately (no payment step)
                $startsAt = now();
                $endsAt   = $startsAt->copy()->addDays($TRIAL_DAYS);

                $subscription = Subscription::create([
                    'clinic_id'      => $clinic->id,
                    'plan_id'        => $plan->id,
                    'billing_cycle'  => 'trial',
                    'amount_paid'    => 0,
                    'payment_method' => 'none',
                    'status'         => 'trialing',
                    'starts_at'      => $startsAt,
                    'ends_at'        => $endsAt,
                ]);

                $clinic->update(['subscription_ends_at' => $endsAt]);

                $amount = 0;
            } else {
                // Paid plan → pending subscription, payment required next
                $amount = $data['billing_cycle'] === 'annual'
                    ? $plan->annual_price
                    : $plan->monthly_price;

                $subscription = Subscription::create([
                    'clinic_id'      => $clinic->id,
                    'plan_id'        => $plan->id,
                    'billing_cycle'  => $data['billing_cycle'],
                    'amount_paid'    => 0,
                    'payment_method' => $data['payment_method'],
                    'status'         => 'pending',
                ]);
            }

            Log::info('[Aylah] New clinic registration', [
                'clinic'    => $clinic->name,
                'email'     => $clinic->email,
                'plan'      => $plan->name,
                'plan_type' => $plan->type,
                'cycle'     => $isFree ? 'trial' : $data['billing_cycle'],
                'amount'    => $amount,
                'is_free'   => $isFree,
            ]);

            return compact('clinic', 'user', 'subscription', 'plan', 'amount');
        });
    }
}
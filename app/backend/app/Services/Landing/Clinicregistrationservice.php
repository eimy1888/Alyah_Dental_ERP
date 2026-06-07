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

            // 1. Create the clinic
            $clinic = Clinic::create([
                'name'    => $data['clinic_name'],
                'email'   => $data['clinic_email'],
                'phone'   => $data['clinic_phone'],
                'address' => $data['clinic_address'] ?? null,
                'city'    => $data['clinic_city'] ?? null,
                'country' => $data['clinic_country'] ?? 'Ethiopia',
                'plan_id' => $data['plan_id'],
                'status'  => 'pending_payment',
                'settings' => [
                    'invoice_prefix'           => 'INV',
                    'theme'                    => 'default',
                    'notifications_enabled'    => true,
                ],
                'subdomain' => Clinic::generateSubdomain($data['clinic_name']),
            ]);

            // 2. Create the clinic admin user
            $user = User::create([
                'clinic_id' => $clinic->id,
                'name'      => $data['admin_name'],
                'email'     => $data['admin_email'],
                'phone'     => $data['admin_phone'] ?? null,
                'password'  => Hash::make($data['admin_password']),
                'role'      => 'clinic_admin',
                'is_active' => false, // inactive until clinic is approved
            ]);

            // 3. Create a PENDING subscription record
            $plan = Plan::find($data['plan_id']);

            $amount = $data['billing_cycle'] === 'annual'
                ? $plan->annual_price
                : $plan->monthly_price;

            $subscription = Subscription::create([
                'clinic_id'      => $clinic->id,
                'plan_id'        => $data['plan_id'],
                'billing_cycle'  => $data['billing_cycle'],
                'amount_paid'    => 0,            // not paid yet
                'payment_method' => $data['payment_method'],
                'status'         => 'pending',
            ]);

            // 4. Notify platform admin (mock — log for now)
            Log::info('[Aylah] New clinic registration', [
                'clinic'  => $clinic->name,
                'email'   => $clinic->email,
                'plan'    => $plan->name,
                'cycle'   => $data['billing_cycle'],
                'amount'  => $amount,
            ]);

            return compact('clinic', 'user', 'subscription', 'plan', 'amount');
        });
    }
}
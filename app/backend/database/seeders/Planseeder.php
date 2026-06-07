<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name'           => 'Basic',
                'slug'           => 'basic',
                'monthly_price'  => 149.00,
                'annual_price'   => 1490.00,   // ~2 months free
                'max_users'      => 5,
                'max_branches'   => 1,
                'max_storage_gb' => 5,
                'is_active'      => true,
                'features'       => [
                    'Appointment scheduling',
                    'Patient records',
                    'Basic invoicing',
                    'Inventory tracking',
                    'Email support',
                ],
            ],
            [
                'name'           => 'Pro',
                'slug'           => 'pro',
                'monthly_price'  => 289.00,
                'annual_price'   => 2890.00,
                'max_users'      => 20,
                'max_branches'   => 3,
                'max_storage_gb' => 20,
                'is_active'      => true,
                'features'       => [
                    'Everything in Basic',
                    'Multi-branch management',
                    'Insurance claims',
                    'Financial reports & P&L',
                    'Waitlist management',
                    'SMS notifications',
                    'Priority support',
                ],
            ],
            [
                'name'           => 'Enterprise',
                'slug'           => 'enterprise',
                'monthly_price'  => 499.00,
                'annual_price'   => 4990.00,
                'max_users'      => 999,       // unlimited
                'max_branches'   => 999,
                'max_storage_gb' => 100,
                'is_active'      => true,
                'features'       => [
                    'Everything in Pro',
                    'Unlimited users & branches',
                    'Custom subdomain',
                    'API access',
                    'Advanced analytics',
                    'Dedicated account manager',
                    'SLA guarantee',
                    'Custom integrations',
                ],
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $this->command->info('Plans seeded: Basic, Pro, Enterprise');
    }
}
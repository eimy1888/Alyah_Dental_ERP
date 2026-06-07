<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DemoClinicSeeder extends Seeder
{
    public function run(): void
    {
        $proPlan = Plan::where('slug', 'pro')->firstOrFail();

        // ── 1. Create the demo clinic ─────────────────────────────────────────
        $clinic = Clinic::updateOrCreate(
            ['email' => 'admin@nilesmile.com'],
            [
                'name'      => 'Nile Smile Specialty Dental',
                'subdomain' => 'nile-smile',
                'email'     => 'admin@nilesmile.com',
                'phone'     => '+251911000001',
                'address'   => 'Bole Road, Near Edna Mall',
                'city'      => 'Addis Ababa',
                'country'   => 'Ethiopia',
                'status'    => 'active',
                'plan_id'   => $proPlan->id,
                'approved_at'          => Carbon::now()->subDays(30),
                'subscription_ends_at' => Carbon::now()->addMonths(11),
                'settings'  => [
                    'invoice_prefix'        => 'NSM',
                    'theme'                 => 'blue',
                    'notifications_enabled' => true,
                    'currency'              => 'ETB',
                ],
            ]
        );

        $this->command->info('Clinic created: ' . $clinic->name . ' (ID: ' . $clinic->id . ')');

        // ── 2. Active subscription ────────────────────────────────────────────
        Subscription::updateOrCreate(
            ['clinic_id' => $clinic->id, 'status' => 'active'],
            [
                'plan_id'           => $proPlan->id,
                'billing_cycle'     => 'annual',
                'amount_paid'       => $proPlan->annual_price,
                'payment_method'    => 'telebirr',
                'payment_reference' => 'MOCK-TELEBIRR-SEED001',
                'status'            => 'active',
                'starts_at'         => Carbon::now()->subDays(30),
                'ends_at'           => Carbon::now()->addMonths(11),
            ]
        );

        // ── 3. Clinic admin ───────────────────────────────────────────────────
        User::updateOrCreate(
            ['email' => 'dr.abel@nilesmile.com'],
            [
                'clinic_id' => $clinic->id,
                'name'      => 'Dr. Abel Dasta',
                'email'     => 'dr.abel@nilesmile.com',
                'phone'     => '+251911000002',
                'password'  => Hash::make('password'),
                'role'      => 'clinic_admin',
                'is_active' => true,
                'email_verified_at' => Carbon::now(),
            ]
        );

        // ── 4. Platform admin ─────────────────────────────────────────────────
        User::updateOrCreate(
            ['email' => 'platform@aylah.com'],
            [
                'clinic_id' => null,
                'name'      => 'Aylah Platform Admin',
                'email'     => 'platform@aylah.com',
                'phone'     => '+251900000001',
                'password'  => Hash::make('password'),
                'role'      => 'platform_admin',
                'is_active' => true,
                'email_verified_at' => Carbon::now(),
            ]
        );

        $this->command->info('');
        $this->command->info('✅ Demo clinic seeded successfully!');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('🏥 Clinic: Nile Smile Specialty Dental');
        $this->command->info('👨‍💼 Clinic admin: dr.abel@nilesmile.com / password');
        $this->command->info('👨‍💻 Platform admin: platform@aylah.com / password');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}
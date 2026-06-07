<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Clinic;
use App\Models\Branch;
use Carbon\Carbon;

class AccountantSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Starting AccountantSeeder...');

        // Get existing clinic (created by DemoClinicSeeder)
        $clinic = Clinic::where('name', 'Nile Smile Specialty Dental')->first();
        if (!$clinic) {
            $this->command->error('Clinic not found. Run DemoClinicSeeder first.');
            return;
        }

        // Get branches (created by BranchSeeder)
        $branches = Branch::where('clinic_id', $clinic->id)->get();
        if ($branches->isEmpty()) {
            $this->command->error('Branches not found. Run BranchSeeder first.');
            return;
        }

        // ── Accountant User ─────────────────────────────────────────────
        $accountant = User::firstOrCreate(
            ['email' => 'selamawit@nilesmile.com'],
            [
                'name' => 'Selamawit Desta',
                'password' => Hash::make('password'),
                'role' => 'accountant',
                'clinic_id' => $clinic->id,
                'branch_id' => null, // Accountant sees all branches
                'phone' => '+251 911 888 999',
            ]
        );
        $this->command->info('Accountant: ' . $accountant->name . ' (selamawit@nilesmile.com / password)');

        $this->command->info('✅ AccountantSeeder completed successfully!');
    }
}
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Clinic;
use App\Models\Branch;
use App\Models\Staff;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\XRay;
use App\Models\ClinicalNote;
use Carbon\Carbon;

class DentistSeeder extends Seeder
{
    public function run(): void
    {
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

        // Use first branch as default
        $defaultBranch = $branches->first();

        // ── Dentist User ────────────────────────────────────
        $dentistUser = User::firstOrCreate(
            ['email' => 'michael.chen@nilesmile.com'],
            [
                'name'      => 'Dr. Michael Chen',
                'password'  => Hash::make('password'),
                'role'      => 'dentist',
                'clinic_id' => $clinic->id,
                'branch_id' => $defaultBranch->id,
                'phone'     => '+251 911 000 200',
                'is_active' => true,
            ]
        );

        // ── Staff record for dentist (EAT times - direct storage) ────────
        Staff::firstOrCreate(
            ['user_id' => $dentistUser->id],
            [
                'clinic_id'      => $clinic->id,
                'branch_id'      => $defaultBranch->id,
                'specialization' => 'Orthodontist',
                'working_days'   => 'Mon, Tue, Wed, Thu, Fri, Sat',
                // EAT times: morning 08:30-12:00, afternoon 13:30-17:00
                'time_window'    => '08:30-12:00,13:30-17:00',
                'bio'            => 'Dr. Michael Chen is a board-certified orthodontist with over 10 years of experience.',
                'show_on_showcase' => true,
                'is_available'   => true,
            ]
        );
        $this->command->info('Dentist Staff record created with EAT working hours.');

        // ── Second Dentist User ───────────────────────────────
        $dentistUser2 = User::firstOrCreate(
            ['email' => 'sarah.johnson@nilesmile.com'],
            [
                'name'      => 'Dr. Sarah Johnson',
                'password'  => Hash::make('password'),
                'role'      => 'dentist',
                'clinic_id' => $clinic->id,
                'branch_id' => $defaultBranch->id,
                'phone'     => '+251 911 000 201',
                'is_active' => true,
            ]
        );

        Staff::firstOrCreate(
            ['user_id' => $dentistUser2->id],
            [
                'clinic_id'      => $clinic->id,
                'branch_id'      => $defaultBranch->id,
                'specialization' => 'Oral Surgeon',
                'working_days'   => 'Mon, Tue, Wed, Thu, Fri',
                // EAT times: morning only 08:30-12:00
                'time_window'    => '08:30-12:00',
                'bio'            => 'Dr. Sarah Johnson specializes in oral surgery and dental implants.',
                'show_on_showcase' => true,
                'is_available'   => true,
            ]
        );
        $this->command->info('Second Dentist Staff record created with EAT working hours.');

        // ── Third Dentist User ───────────────────────────────
        $dentistUser3 = User::firstOrCreate(
            ['email' => 'tsegaye.abera@nilesmile.com'],
            [
                'name'      => 'Dr. Tsegaye Abera',
                'password'  => Hash::make('password'),
                'role'      => 'dentist',
                'clinic_id' => $clinic->id,
                'branch_id' => $defaultBranch->id,
                'phone'     => '+251 911 000 202',
                'is_active' => true,
            ]
        );

        Staff::firstOrCreate(
            ['user_id' => $dentistUser3->id],
            [
                'clinic_id'      => $clinic->id,
                'branch_id'      => $defaultBranch->id,
                'specialization' => 'Pediatric Dentist',
                'working_days'   => 'Mon, Tue, Wed, Thu, Fri, Sat',
                // EAT times: afternoon only 13:30-17:00
                'time_window'    => '13:30-17:00',
                'bio'            => 'Dr. Tsegaye Abera specializes in children\'s dentistry and preventive care.',
                'show_on_showcase' => true,
                'is_available'   => true,
            ]
        );
        $this->command->info('Third Dentist Staff record created with EAT working hours.');

        // ── Receptionist (creates appointments) ────────
        User::firstOrCreate(
            ['email' => 'mahi.tarekegn@nilesmile.com'],
            [
                'name'      => 'Mahi Tarekegn',
                'password'  => Hash::make('password'),
                'role'      => 'receptionist',
                'clinic_id' => $clinic->id,
                'branch_id' => $defaultBranch->id,
                'phone'     => '+251 911 000 300',
                'is_active' => true,
            ]
        );

        $this->command->info('✅ DentistSeeder complete.');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info("   Dentist 1: michael.chen@nilesmile.com / password (Orthodontist)");
        $this->command->info("   Dentist 2: sarah.johnson@nilesmile.com / password (Oral Surgeon)");
        $this->command->info("   Dentist 3: tsegaye.abera@nilesmile.com / password (Pediatric Dentist)");
        $this->command->info("   Receptionist: mahi.tarekegn@nilesmile.com / password");
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,              // 1. Create plans first
            DemoClinicSeeder::class,        // 2. Create clinic and admin users
            BranchSeeder::class,            // 3. Create branches AND branch managers
            DentistSeeder::class,           // 4. Dentist and receptionist
            AccountantSeeder::class,        // 5. Accountant and financial data
            PatientSeeder::class,           // 6. Patients and appointments
            SpecializationSeeder::class,    // 7. System specializations catalogue
            ServiceSeeder::class,           // 8. Dental services catalogue
        ]);
    }
}
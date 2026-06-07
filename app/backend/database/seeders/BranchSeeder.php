<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        // Get existing clinic (created by DemoClinicSeeder)
        $clinic = Clinic::where('name', 'Nile Smile Specialty Dental')->first();
        if (!$clinic) {
            return;
        }

        // ── Main Branch ──────────────────────────────────────────────────────
        $mainBranch = Branch::firstOrCreate(
            ['clinic_id' => $clinic->id, 'name' => 'Main Branch'],
            [
                'location'   => 'Bole Road, Near Edna Mall, Addis Ababa',
                'phone'      => '+251 911 000 100',
                'email'      => 'main@nilesmile.com',
                'status'     => 'active',
                'manager_id' => null,
            ]
        );

        // ── Second Branch ────────────────────────────────────────────────────
        $secondBranch = Branch::firstOrCreate(
            ['clinic_id' => $clinic->id, 'name' => 'Piassa Branch'],
            [
                'location'   => 'Piassa, Near Commercial Bank, Addis Ababa',
                'phone'      => '+251 911 000 101',
                'email'      => 'piassa@nilesmile.com',
                'status'     => 'active',
                'manager_id' => null,
            ]
        );

        // ── Branch Manager for Main Branch ───────────────────────────────────
        $managerUser = User::firstOrCreate(
            ['email' => 'alemu.molla@nilesmile.com'],
            [
                'name'      => 'Alemu Molla',
                'password'  => Hash::make('password'),
                'role'      => 'branch_manager',
                'clinic_id' => $clinic->id,
                'branch_id' => $mainBranch->id,
                'phone'     => '+251 911 000 400',
                'is_active' => true,
            ]
        );

        $mainBranch->update(['manager_id' => $managerUser->id]);

        Staff::firstOrCreate(
            ['user_id' => $managerUser->id],
            [
                'clinic_id'      => $clinic->id,
                'branch_id'      => $mainBranch->id,
                'specialization' => 'Branch Management',
                'working_days'   => 'Mon, Tue, Wed, Thu, Fri, Sat',
                'time_window'    => '08:30-12:00,13:30-17:00',
                'is_available'   => true,
            ]
        );

        // ── Branch Manager for Piassa Branch ─────────────────────────────────
        $managerUser2 = User::firstOrCreate(
            ['email' => 'hiwot.teklu@nilesmile.com'],
            [
                'name'      => 'Hiwot Teklu',
                'password'  => Hash::make('password'),
                'role'      => 'branch_manager',
                'clinic_id' => $clinic->id,
                'branch_id' => $secondBranch->id,
                'phone'     => '+251 911 000 401',
                'is_active' => true,
            ]
        );

        $secondBranch->update(['manager_id' => $managerUser2->id]);

        Staff::firstOrCreate(
            ['user_id' => $managerUser2->id],
            [
                'clinic_id'      => $clinic->id,
                'branch_id'      => $secondBranch->id,
                'specialization' => 'Branch Management',
                'working_days'   => 'Mon, Tue, Wed, Thu, Fri, Sat',
                'time_window'    => '08:30-12:00,13:30-17:00',
                'is_available'   => true,
            ]
        );
    }
}

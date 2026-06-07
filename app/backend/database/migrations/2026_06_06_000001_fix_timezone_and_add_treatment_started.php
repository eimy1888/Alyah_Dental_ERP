<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Check if treatment_started already exists in the enum before adding
        $this->addTreatmentStartedStatus();

        // 2. Fix staff time_window values from any old incorrect times to correct EAT times
        $this->fixStaffTimeWindow();

        // 3. Update any staff with empty time_window to use default EAT times
        $this->setDefaultTimeWindow();
    }

    /**
     * Add 'treatment_started' to appointments status enum if not already present
     */
    private function addTreatmentStartedStatus(): void
    {
        // Check current enum values
        $result = DB::select("SHOW COLUMNS FROM appointments WHERE Field = 'status'");
        if (empty($result)) {
            return;
        }

        $enumStr = $result[0]->Type;
        preg_match('/^enum\((.*)\)$/', $enumStr, $matches);
        if (empty($matches[1])) {
            return;
        }

        $enumValues = array_map(function($value) {
            return trim($value, "'");
        }, explode(',', $matches[1]));

        // Check if treatment_started already exists
        if (!in_array('treatment_started', $enumValues)) {
            // Add treatment_started to the enum
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM(
                'pending',
                'confirmed',
                'checked_in',
                'in_progress',
                'treatment_started',
                'completed',
                'no_show',
                'cancelled'
            ) NOT NULL DEFAULT 'pending'");
        }
    }

    /**
     * Fix staff time_window values from any old incorrect times to correct EAT times
     * EAT clinic hours: morning 08:30-12:00, afternoon 13:30-17:00
     */
    private function fixStaffTimeWindow(): void
    {
        // Check if staff table exists
        if (!Schema::hasTable('staff')) {
            return;
        }

        // Check if time_window column exists
        if (!Schema::hasColumn('staff', 'time_window')) {
            return;
        }

        // Fix old UTC-offset format: "05:30-09:00,10:30-14:00" -> "08:30-12:00,13:30-17:00"
        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(time_window,
                            '05:30', '08:30'),
                        '09:00', '12:00'),
                    '10:30', '13:30'),
                '14:00', '17:00')
            WHERE time_window LIKE '%05:30%'
               OR time_window LIKE '%10:30%'
        ");

        // Fix single session: "05:30-09:00" -> "08:30-12:00"
        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(time_window, '05:30-09:00', '08:30-12:00')
            WHERE time_window = '05:30-09:00'
        ");

        // Fix single session: "10:30-14:00" -> "13:30-17:00"
        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(time_window, '10:30-14:00', '13:30-17:00')
            WHERE time_window = '10:30-14:00'
        ");

        // Fix combined format directly
        DB::statement("
            UPDATE staff
            SET time_window = '08:30-12:00,13:30-17:00'
            WHERE time_window = '05:30-09:00,10:30-14:00'
        ");

        // Fix even older format: "02:30-06:00,07:30-11:00" -> "08:30-12:00,13:30-17:00"
        DB::statement("
            UPDATE staff
            SET time_window = '08:30-12:00,13:30-17:00'
            WHERE time_window LIKE '%02:30%'
               OR time_window LIKE '%07:30%'
        ");
    }

    /**
     * Set default time_window for staff with empty or NULL values
     */
    private function setDefaultTimeWindow(): void
    {
        if (!Schema::hasTable('staff')) {
            return;
        }

        if (!Schema::hasColumn('staff', 'time_window')) {
            return;
        }

        DB::statement("
            UPDATE staff
            SET time_window = '08:30-12:00,13:30-17:00'
            WHERE time_window IS NULL OR time_window = ''
        ");
    }

    public function down(): void
    {
        // Revert time_window back to old values (if needed for rollback)
        $this->revertStaffTimeWindow();

        // Remove treatment_started from enum
        $this->removeTreatmentStartedStatus();
    }

    /**
     * Revert time_window back to old UTC-offset times (rollback)
     */
    private function revertStaffTimeWindow(): void
    {
        if (!Schema::hasTable('staff')) {
            return;
        }

        if (!Schema::hasColumn('staff', 'time_window')) {
            return;
        }

        // Revert EAT -> UTC offset format
        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(time_window,
                            '08:30', '05:30'),
                        '12:00', '09:00'),
                    '13:30', '10:30'),
                '17:00', '14:00')
            WHERE time_window LIKE '%08:30%'
               OR time_window LIKE '%13:30%'
        ");

        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(time_window, '08:30-12:00', '05:30-09:00')
            WHERE time_window = '08:30-12:00'
        ");

        DB::statement("
            UPDATE staff
            SET time_window = REPLACE(time_window, '13:30-17:00', '10:30-14:00')
            WHERE time_window = '13:30-17:00'
        ");
    }

    /**
     * Remove treatment_started from appointments status enum
     */
    private function removeTreatmentStartedStatus(): void
    {
        // First check if any appointments have treatment_started status
        $count = DB::table('appointments')
            ->where('status', 'treatment_started')
            ->count();

        if ($count > 0) {
            // Update any treatment_started appointments to in_progress before removing
            DB::table('appointments')
                ->where('status', 'treatment_started')
                ->update(['status' => 'in_progress']);
        }

        // Remove treatment_started from enum
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM(
            'pending',
            'confirmed',
            'checked_in',
            'in_progress',
            'completed',
            'no_show',
            'cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }
};

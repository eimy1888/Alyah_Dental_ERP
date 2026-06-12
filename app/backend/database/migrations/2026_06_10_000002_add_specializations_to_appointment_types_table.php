<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Add required_specializations to appointment_types.
 * Also back-fill the known specialization mappings for seeded treatments.
 *
 * required_specializations — JSON array of staff.specialization strings.
 *   Empty array = any/general dentist can perform it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_types', function (Blueprint $table) {
            $table->json('required_specializations')
                ->nullable()
                ->after('sort_order')
                ->comment('JSON array of staff specialization strings required. Empty = any dentist.');
        });

        // Back-fill specialization mappings for seeded system types
        $map = [
            'RCT'     => ['Endodontist', 'General Dentistry'],
            'CROWN'   => ['Prosthodontist', 'General Dentistry'],
            'BRIDGE'  => ['Prosthodontist', 'General Dentistry'],
            'DENTURE' => ['Prosthodontist', 'General Dentistry'],
            'IMPLANT' => ['Oral Surgeon', 'Prosthodontist'],
            'VENEER'  => ['Cosmetic Dentist', 'General Dentistry'],
            'WISDOM'  => ['Oral Surgeon', 'General Dentistry'],
            'XTRACT'  => ['Oral Surgeon', 'General Dentistry'],
            'ORTHO'   => ['Orthodontist'],
            'WHITE'   => ['Cosmetic Dentist', 'General Dentistry'],
        ];

        foreach ($map as $shortCode => $specs) {
            DB::table('appointment_types')
                ->whereNull('clinic_id')
                ->where('short_code', $shortCode)
                ->update(['required_specializations' => json_encode($specs)]);
        }
    }

    public function down(): void
    {
        Schema::table('appointment_types', function (Blueprint $table) {
            $table->dropColumn('required_specializations');
        });
    }
};

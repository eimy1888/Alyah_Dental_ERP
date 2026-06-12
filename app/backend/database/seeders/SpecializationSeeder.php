<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the system-level specializations (clinic_id = null).
 * These are visible to all clinics and cannot be deleted.
 *
 * Safe to re-run — uses INSERT IGNORE / updateOrInsert.
 */
class SpecializationSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['name' => 'General Dentistry',   'short_code' => 'GD',    'description' => 'Routine care, checkups, fillings, basic extractions',    'sort_order' => 1],
            ['name' => 'Orthodontist',         'short_code' => 'ORTHO', 'description' => 'Braces, aligners, bite and alignment correction',         'sort_order' => 2],
            ['name' => 'Oral Surgeon',         'short_code' => 'ORS',   'description' => 'Extractions, implants, jaw surgery',                      'sort_order' => 3],
            ['name' => 'Endodontist',          'short_code' => 'ENDO',  'description' => 'Root canal and pulp treatment',                           'sort_order' => 4],
            ['name' => 'Periodontist',         'short_code' => 'PERIO', 'description' => 'Gum disease, scaling, bone grafts',                       'sort_order' => 5],
            ['name' => 'Prosthodontist',       'short_code' => 'PROS',  'description' => 'Crowns, bridges, dentures, veneers',                      'sort_order' => 6],
            ['name' => 'Pediatric Dentist',    'short_code' => 'PED',   'description' => "Children's dental care",                                  'sort_order' => 7],
            ['name' => 'Cosmetic Dentist',     'short_code' => 'COS',   'description' => 'Whitening, veneers, smile design',                        'sort_order' => 8],
        ];

        foreach ($defaults as $spec) {
            DB::table('specializations')->updateOrInsert(
                ['clinic_id' => null, 'name' => $spec['name']],
                [
                    'short_code'  => $spec['short_code'],
                    'description' => $spec['description'],
                    'is_active'   => true,
                    'sort_order'  => $spec['sort_order'],
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]
            );
        }

        $this->command->info('✅ Seeded ' . count($defaults) . ' system specializations.');
    }
}

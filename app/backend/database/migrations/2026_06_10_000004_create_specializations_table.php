<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * specializations — clinic-defined dental specializations.
 *
 * clinic_id = null → system default (seeded, visible to all clinics).
 * clinic_id = N    → custom, visible only to that clinic.
 *
 * Used in:
 *   - staff.specialization (FK or free-text match)
 *   - service.required_specializations JSON array
 *   - appointment booking modal specialty picker
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specializations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('clinic_id')
                ->nullable()
                ->constrained('clinics')
                ->cascadeOnDelete();

            $table->string('name');           // "General Dentistry"
            $table->string('short_code')->nullable(); // "GD"
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['clinic_id', 'is_active']);
        });

        // Seed system defaults
        DB::table('specializations')->insert([
            ['clinic_id'=>null,'name'=>'General Dentistry',   'short_code'=>'GD',    'description'=>'Routine care, checkups, fillings, basic extractions','is_active'=>true,'sort_order'=>1, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Orthodontist',        'short_code'=>'ORTHO', 'description'=>'Braces, aligners, bite and alignment correction',      'is_active'=>true,'sort_order'=>2, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Oral Surgeon',        'short_code'=>'ORS',   'description'=>'Extractions, implants, jaw surgery',                   'is_active'=>true,'sort_order'=>3, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Endodontist',         'short_code'=>'ENDO',  'description'=>'Root canal and pulp treatment',                        'is_active'=>true,'sort_order'=>4, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Periodontist',        'short_code'=>'PERIO', 'description'=>'Gum disease, scaling, bone grafts',                    'is_active'=>true,'sort_order'=>5, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Prosthodontist',      'short_code'=>'PROS',  'description'=>'Crowns, bridges, dentures, veneers',                   'is_active'=>true,'sort_order'=>6, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Pediatric Dentist',   'short_code'=>'PED',   'description'=>"Children's dental care",                               'is_active'=>true,'sort_order'=>7, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Cosmetic Dentist',    'short_code'=>'COS',   'description'=>'Whitening, veneers, smile design',                     'is_active'=>true,'sort_order'=>8, 'created_at'=>now(),'updated_at'=>now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('specializations');
    }
};

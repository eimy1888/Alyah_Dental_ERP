<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * appointment_types — controlled vocabulary for appointment types.
 *
 * WHY: 'type' on appointments is currently free-text.
 * "Root Canal" vs "root canal" vs "RCT" all mean the same thing
 * but produce different rows in reports — useless aggregation.
 *
 * Clinics can add their own types. System defaults are seeded.
 * appointment.type stores the display name (string, kept for backward compat).
 * appointment.appointment_type_id links to this table for reporting.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')
                ->nullable()  // null = system default visible to all clinics
                ->constrained('clinics')
                ->cascadeOnDelete();
            $table->string('name');           // "Root Canal Treatment"
            $table->string('short_code');     // "RCT"
            $table->string('category')
                ->default('general');         // general|preventive|restorative|cosmetic|surgical|emergency
            $table->integer('default_duration_minutes')->default(30);
            $table->enum('billing_model', ['service','treatment','hybrid'])->default('treatment');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['clinic_id', 'is_active']);
            $table->index('category');
        });

        // Link appointment.appointment_type_id (nullable — old rows stay valid)
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('appointment_type_id')
                ->nullable()
                ->after('type')
                ->constrained('appointment_types')
                ->nullOnDelete();
        });

        // Seed system-level defaults (clinic_id = null)
        DB::table('appointment_types')->insert([
            // General
            ['clinic_id'=>null,'name'=>'Consultation',              'short_code'=>'CONSULT', 'category'=>'general',       'default_duration_minutes'=>30,  'billing_model'=>'service',   'sort_order'=>1,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Follow-Up',                 'short_code'=>'FOLLOW',  'category'=>'general',       'default_duration_minutes'=>20,  'billing_model'=>'service',   'sort_order'=>2,  'created_at'=>now(),'updated_at'=>now()],
            // Preventive
            ['clinic_id'=>null,'name'=>'Teeth Cleaning (Scaling)',  'short_code'=>'SCALE',   'category'=>'preventive',    'default_duration_minutes'=>45,  'billing_model'=>'service',   'sort_order'=>3,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Fluoride Treatment',        'short_code'=>'FLUOR',   'category'=>'preventive',    'default_duration_minutes'=>20,  'billing_model'=>'service',   'sort_order'=>4,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'X-Ray',                     'short_code'=>'XRAY',    'category'=>'preventive',    'default_duration_minutes'=>15,  'billing_model'=>'service',   'sort_order'=>5,  'created_at'=>now(),'updated_at'=>now()],
            // Restorative
            ['clinic_id'=>null,'name'=>'Filling',                   'short_code'=>'FILL',    'category'=>'restorative',   'default_duration_minutes'=>45,  'billing_model'=>'service',   'sort_order'=>6,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Root Canal Treatment',      'short_code'=>'RCT',     'category'=>'restorative',   'default_duration_minutes'=>90,  'billing_model'=>'treatment', 'sort_order'=>7,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Crown Placement',           'short_code'=>'CROWN',   'category'=>'restorative',   'default_duration_minutes'=>60,  'billing_model'=>'treatment', 'sort_order'=>8,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Bridge',                    'short_code'=>'BRIDGE',  'category'=>'restorative',   'default_duration_minutes'=>60,  'billing_model'=>'treatment', 'sort_order'=>9,  'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Denture',                   'short_code'=>'DENTURE', 'category'=>'restorative',   'default_duration_minutes'=>60,  'billing_model'=>'treatment', 'sort_order'=>10, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Implant',                   'short_code'=>'IMPLANT', 'category'=>'restorative',   'default_duration_minutes'=>120, 'billing_model'=>'treatment', 'sort_order'=>11, 'created_at'=>now(),'updated_at'=>now()],
            // Cosmetic
            ['clinic_id'=>null,'name'=>'Teeth Whitening',           'short_code'=>'WHITE',   'category'=>'cosmetic',      'default_duration_minutes'=>60,  'billing_model'=>'service',   'sort_order'=>12, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Veneer',                    'short_code'=>'VENEER',  'category'=>'cosmetic',      'default_duration_minutes'=>90,  'billing_model'=>'treatment', 'sort_order'=>13, 'created_at'=>now(),'updated_at'=>now()],
            // Surgical
            ['clinic_id'=>null,'name'=>'Tooth Extraction',          'short_code'=>'XTRACT',  'category'=>'surgical',      'default_duration_minutes'=>30,  'billing_model'=>'service',   'sort_order'=>14, 'created_at'=>now(),'updated_at'=>now()],
            ['clinic_id'=>null,'name'=>'Wisdom Tooth Removal',      'short_code'=>'WISDOM',  'category'=>'surgical',      'default_duration_minutes'=>60,  'billing_model'=>'treatment', 'sort_order'=>15, 'created_at'=>now(),'updated_at'=>now()],
            // Orthodontics
            ['clinic_id'=>null,'name'=>'Orthodontic Consultation',  'short_code'=>'ORTHO',   'category'=>'general',       'default_duration_minutes'=>45,  'billing_model'=>'treatment', 'sort_order'=>16, 'created_at'=>now(),'updated_at'=>now()],
            // Emergency
            ['clinic_id'=>null,'name'=>'Emergency',                 'short_code'=>'EMRG',    'category'=>'emergency',     'default_duration_minutes'=>30,  'billing_model'=>'treatment', 'sort_order'=>0,  'created_at'=>now(),'updated_at'=>now()],
        ]);
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['appointment_type_id']);
            $table->dropColumn('appointment_type_id');
        });
        Schema::dropIfExists('appointment_types');
    }
};

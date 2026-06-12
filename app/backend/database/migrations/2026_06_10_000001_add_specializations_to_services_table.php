<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add specialization-matching fields to services.
 *
 * required_specializations — JSON array of staff.specialization strings
 *   that can perform this service.
 *   Empty array = any/general dentist can perform it.
 *   e.g. ["Orthodontist"] — only orthodontists appear in dentist selector.
 *
 * booking_type — 'service' | 'treatment'
 *   service   = patient picks a specific service → filtered dentist list
 *   treatment = patient picks specialty → general dentist workflow
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->json('required_specializations')
                ->nullable()
                ->after('display_order')
                ->comment('JSON array of specialization strings required to perform this service. Empty = any dentist.');

            $table->enum('booking_type', ['service', 'treatment'])
                ->default('service')
                ->after('required_specializations')
                ->comment('service=patient selects service first; treatment=dentist-driven workflow');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['required_specializations', 'booking_type']);
        });
    }
};

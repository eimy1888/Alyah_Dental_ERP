<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link procedures to treatment episodes and projections.
 * FULLY ADDITIVE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procedures', function (Blueprint $table) {

            // Which episode this procedure belongs to
            $table->foreignId('treatment_episode_id')
                ->nullable()
                ->after('appointment_id')
                ->constrained('treatment_episodes')
                ->nullOnDelete();

            // Sequence within the episode
            $table->unsignedSmallInteger('sequence')->default(1)->after('treatment_episode_id');

            // Tooth surface notation (FDI format: 18, 17... or quadrant)
            $table->string('tooth_surface')->nullable()->after('tooth_number');

            // ICD-10 / procedure code for insurance
            $table->string('procedure_code')->nullable()->after('tooth_surface');

            $table->index(['treatment_episode_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table) {
            $table->dropForeign(['treatment_episode_id']);
            $table->dropColumn([
                'treatment_episode_id', 'sequence',
                'tooth_surface', 'procedure_code',
            ]);
        });
    }
};

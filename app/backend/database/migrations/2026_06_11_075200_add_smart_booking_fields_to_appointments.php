<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'appointment_kind')) {
                $table->enum('appointment_kind', ['service', 'treatment', 'emergency'])
                      ->default('treatment')->after('billing_model');
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'is_emergency_bypass')) {
                $table->boolean('is_emergency_bypass')->default(false)->after('appointment_kind');
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'treatment_plan_id')) {
                $table->unsignedBigInteger('treatment_plan_id')->nullable()->after('is_emergency_bypass');
                $table->foreign('treatment_plan_id')->references('id')->on('treatment_plans')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['treatment_plan_id']);
            $table->dropColumn(['appointment_kind', 'is_emergency_bypass', 'treatment_plan_id']);
        });
    }
};

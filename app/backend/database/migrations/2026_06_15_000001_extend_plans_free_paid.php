<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends the plans table to support free vs paid plan types.
 * Free plans: duration_days + no pricing required.
 * Paid plans: monthly_price + annual_price + duration_unit/value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // Plan type: free or paid
            $table->enum('type', ['free', 'paid'])->default('paid')->after('slug');

            // Duration for free plans (in days)
            $table->unsignedSmallInteger('duration_days')->nullable()->after('type')
                ->comment('For free plans: number of days the plan lasts');

            // Duration for paid plans (more flexible)
            $table->unsignedSmallInteger('duration_value')->nullable()->after('duration_days')
                ->comment('For paid plans: numeric value of the billing duration');
            $table->enum('duration_unit', ['days', 'months', 'years'])->nullable()->after('duration_value')
                ->comment('For paid plans: unit of the billing duration');

            // Make price columns nullable (free plans have no price)
            $table->decimal('monthly_price', 12, 2)->nullable()->default(null)->change();
            $table->decimal('annual_price', 12, 2)->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['type', 'duration_days', 'duration_value', 'duration_unit']);
            $table->decimal('monthly_price', 10, 2)->nullable(false)->default(0)->change();
            $table->decimal('annual_price', 10, 2)->nullable(false)->default(0)->change();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend appointments table for billing v2.
 * Adds billing_model, service_id, invoice references, check-in fields.
 * FULLY ADDITIVE — existing data and queries unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {

            // Billing model for this appointment
            $table->enum('billing_model', [
                'service',    // fixed price, invoice at booking
                'treatment',  // dynamic, built by dentist
                'hybrid',     // both service + treatment
            ])->default('treatment')->after('notes');

            // For service-based appointments: which service was booked
            $table->foreignId('service_id')
                ->nullable()
                ->after('billing_model')
                ->constrained('services')
                ->nullOnDelete();

            // Separate invoice references (null = not yet created)
            $table->foreignId('service_invoice_id')
                ->nullable()
                ->after('service_id')
                ->constrained('invoices')
                ->nullOnDelete();

            $table->foreignId('treatment_invoice_id')
                ->nullable()
                ->after('service_invoice_id')
                ->constrained('invoices')
                ->nullOnDelete();

            // check_in_time, start_time, end_time, is_late, late_minutes
            // already added by 2026_05_22_000002 — skip them

            // treatment_started status support (new field only)
            if (!\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'treatment_started')) {
                $table->boolean('treatment_started')->default(false)->after('late_minutes');
            }

            $table->index(['billing_model', 'clinic_id']);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['service_id']);
            $table->dropForeign(['service_invoice_id']);
            $table->dropForeign(['treatment_invoice_id']);
            $table->dropColumn([
                'billing_model', 'service_id',
                'service_invoice_id', 'treatment_invoice_id',
                'check_in_time', 'start_time', 'end_time',
                'is_late', 'late_minutes', 'treatment_started',
            ]);
        });
    }
};

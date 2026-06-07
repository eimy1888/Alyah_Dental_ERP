<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend services table with billing model fields.
 * FULLY ADDITIVE — all new columns have defaults.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Determines which billing flow this service triggers
            $table->enum('billing_model', ['service', 'treatment'])
                ->default('service')
                ->after('price')
                ->comment('service=fixed invoice at booking, treatment=dynamic episode invoice');

            // Auto-generate invoice when appointment is booked?
            $table->boolean('generate_invoice_at_booking')
                ->default(true)
                ->after('billing_model');

            // Allow pre-payment / deposit before service?
            $table->boolean('allow_prepayment')
                ->default(false)
                ->after('generate_invoice_at_booking');

            $table->index(['billing_model'], 'services_billing_model_idx');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropIndex('services_billing_model_idx');
            $table->dropColumn(['billing_model', 'generate_invoice_at_booking', 'allow_prepayment']);
        });
    }
};

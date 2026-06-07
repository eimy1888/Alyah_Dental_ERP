<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            $table->foreignId('fiscal_year_id')
                  ->constrained('fiscal_years')
                  ->cascadeOnDelete();

            // Period details
            $table->tinyInteger('period_month');
            // 1 = January ... 12 = December

            $table->smallInteger('period_year');
            // e.g. 2025, 2026

            $table->string('period_name');
            // e.g. "July 2025", "August 2025"

            // Financial totals for this period
            $table->decimal('revenue',  12, 2)->default(0);
            $table->decimal('expenses', 12, 2)->default(0);
            $table->decimal('net',      12, 2)->default(0);

            // Revenue breakdown
            $table->decimal('revenue_invoices',   12, 2)->default(0);
            $table->decimal('revenue_insurance',  12, 2)->default(0);
            $table->decimal('revenue_other',      12, 2)->default(0);

            // Expense breakdown
            $table->decimal('expense_payroll',     12, 2)->default(0);
            $table->decimal('expense_consumables', 12, 2)->default(0);
            $table->decimal('expense_utilities',   12, 2)->default(0);
            $table->decimal('expense_rent',        12, 2)->default(0);
            $table->decimal('expense_other',       12, 2)->default(0);

            // Status
            $table->enum('status', [
                'open',
                'closed',
            ])->default('open');

            $table->timestamp('closed_at')->nullable();

            // Who closed
            $table->foreignId('closed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['clinic_id', 'fiscal_year_id']);
            $table->index(['clinic_id', 'period_year', 'period_month']);
            $table->index(['fiscal_year_id', 'status']);

            // Each month can only exist once per fiscal year
            // FIX: Use shorter custom name
            $table->unique(['fiscal_year_id', 'period_month', 'period_year'], 'acc_periods_fy_month_year_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_periods');
    }
};
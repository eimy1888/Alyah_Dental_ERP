<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            // Fiscal year details
            $table->string('name');
            // e.g. "FY 2025-2026", "FY 2026-2027"

            $table->date('start_date');
            $table->date('end_date');

            // Status
            $table->boolean('is_active')->default(false);
            $table->boolean('is_closed')->default(false);

            // Summary totals (updated as periods close)
            $table->decimal('total_revenue',  12, 2)->default(0);
            $table->decimal('total_expenses', 12, 2)->default(0);
            $table->decimal('net_income',     12, 2)->default(0);

            // Who created
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['clinic_id', 'is_active']);
            $table->index(['clinic_id', 'is_closed']);
            $table->unique(['clinic_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            // Report details
            $table->string('name');
            // e.g. "Revenue Performance", "Dentist Productivity"

            $table->string('type');
            // revenue, expenses, claims, dentist_productivity,
            // expiry_alert, fiscal_summary, tax_report

            $table->string('scope')->default('clinic-wide');
            // clinic-wide, branch, dentist, period

            // Parameters used to generate this report
            $table->json('parameters')->nullable();
            // e.g. { branch_id: 1, from: "2026-01-01", to: "2026-12-31" }

            $table->enum('format', [
                'PDF',
                'XLSX',
                'CSV',
            ])->default('PDF');

            $table->enum('status', [
                'pending',
                'generating',
                'ready',
                'failed',
            ])->default('pending');

            // File storage
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_size')->nullable();

            // Who owns this report
            $table->string('owner')->nullable();
            // e.g. "Finance", "Operations", "Store Lead"

            // Who generated
            $table->foreignId('generated_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamp('generated_at')->nullable();

            // Scheduled report
            $table->boolean('is_scheduled')->default(false);
            $table->string('schedule_frequency')->nullable();
            // daily, weekly, monthly

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'type']);
            $table->index(['clinic_id', 'status']);
            $table->index(['generated_by', 'generated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
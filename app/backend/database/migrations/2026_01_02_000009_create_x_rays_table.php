<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('x_rays', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->cascadeOnDelete();

            // Core relationships
            $table->foreignId('patient_id')
                  ->constrained('patients')
                  ->cascadeOnDelete();

            $table->foreignId('dentist_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Link to appointment (optional)
            $table->foreignId('appointment_id')
                  ->nullable()
                  ->constrained('appointments')
                  ->nullOnDelete();

            // X-ray details
            $table->string('study_type'); // Panoramic, Periapical, Bitewing, CBCT
            $table->string('tooth_number')->nullable(); // e.g. "16", "22-25"
            $table->string('region')->nullable(); // Upper left, Lower right, Full arch

            // File storage
            // Dummy path for MVP — real storage via Laravel Storage in production
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_size')->nullable();

            $table->enum('status', [
                'pending_upload',
                'ready_for_review',
                'annotated',
            ])->default('pending_upload');

            // Findings / annotation
            $table->text('findings')->nullable();

            $table->date('captured_at');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['patient_id', 'captured_at']);
            $table->index(['dentist_id', 'captured_at']);
            $table->index(['patient_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('x_rays');
    }
};
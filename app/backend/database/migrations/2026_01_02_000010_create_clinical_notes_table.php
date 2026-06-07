<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_notes', function (Blueprint $table) {
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

            // Note details
            $table->string('note_type');
            // Examples: General, Treatment Plan, Post-Op,
            //           Follow-Up, Referral, Complaint

            $table->text('content');

            // Chief complaint (optional — for first visits)
            $table->text('chief_complaint')->nullable();

            // Treatment performed
            $table->text('treatment_performed')->nullable();

            // Follow-up instructions
            $table->text('follow_up')->nullable();

            // Vital signs (optional JSON)
            // Example: { blood_pressure: "120/80", pulse: 72 }
            $table->json('vitals')->nullable();

            // Signature
            $table->boolean('is_signed')->default(false);
            $table->timestamp('signed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['patient_id', 'created_at']);
            $table->index(['dentist_id', 'is_signed']);
            $table->index(['patient_id', 'is_signed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_notes');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
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

            // Prescription details
            $table->string('medication');
            $table->string('dosage');
            $table->integer('duration_days');
            $table->text('instructions')->nullable();
            $table->date('issued_at');

            // Refill tracking
            $table->boolean('is_refillable')->default(false);
            $table->integer('refills_remaining')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['patient_id', 'issued_at']);
            $table->index(['dentist_id', 'issued_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
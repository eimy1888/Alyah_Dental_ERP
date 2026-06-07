<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
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

            // Appointment details
            $table->dateTime('appointment_time');
            $table->integer('duration_minutes')->default(30);
            $table->string('type');  // Consultation, Whitening, Root Canal, etc.

            $table->enum('status', [
                'pending',
                'confirmed',
                'checked_in',
                'in_progress',
                'completed',
                'no_show',
                'cancelled',
            ])->default('pending');

            $table->text('notes')->nullable();

            // Queue position for the day
            $table->integer('queue_position')->nullable();

            // Reschedule tracking
            $table->dateTime('rescheduled_from')->nullable();
            $table->integer('reschedule_count')->default(0);

            // Who created this appointment
            // If created_by != dentist_id → triggers notification bell
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // Notification tracking
            // false = dentist has NOT been notified yet
            $table->boolean('is_notified')->default(false);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['dentist_id', 'appointment_time']);
            $table->index(['patient_id', 'status']);
            $table->index(['dentist_id', 'is_notified']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
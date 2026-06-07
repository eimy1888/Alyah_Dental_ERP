<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_items', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();

            // Links
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('dentist_id')->nullable()->constrained('users')->nullOnDelete();

            // Queue details
            $table->enum('priority', ['emergency', 'scheduled', 'walk_in', 'late_arrival'])
                  ->default('scheduled');
            $table->integer('position')->default(0);
            $table->enum('status', ['waiting', 'in_progress', 'completed', 'removed'])
                  ->default('waiting');
            $table->text('notes')->nullable();

            // Timestamps for tracking
            $table->dateTime('called_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['dentist_id', 'status']);
            $table->index(['status', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_items');
    }
};
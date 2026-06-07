<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recalls', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();

            // Relationships
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('dentist_id')->nullable()->constrained('users')->nullOnDelete();

            // Recall details
            $table->integer('recall_interval_months')->default(6);
            $table->date('due_date');
            $table->date('notification_sent_at')->nullable();
            $table->boolean('notification_sent')->default(false);

            $table->enum('status', ['pending', 'notified', 'booked', 'completed', 'cancelled'])
                  ->default('pending');

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['clinic_id', 'branch_id']);
            $table->index(['due_date', 'status']);
            $table->index('patient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recalls');
    }
};
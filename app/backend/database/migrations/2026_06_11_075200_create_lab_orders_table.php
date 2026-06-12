<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('patient_id');

            $table->unsignedBigInteger('treatment_plan_id')->nullable();
            $table->unsignedBigInteger('appointment_id');

            $table->unsignedBigInteger('ordering_dentist_id');
            $table->unsignedBigInteger('fitting_specialist_id')->nullable();

            $table->string('lab_order_number', 50)->unique();
            $table->enum('order_type', ['crown','bridge','denture','aligner','veneer','implant_crown','diagnostic','other']);
            $table->string('material', 100)->nullable();
            $table->json('tooth_numbers')->nullable();
            $table->text('instructions')->nullable();

            $table->enum('status', ['pending','sent_to_lab','in_progress','ready','delivered','cancelled'])->default('pending');

            $table->date('expected_ready_date')->nullable();
            $table->date('actual_ready_date')->nullable();

            $table->unsignedBigInteger('fitting_appointment_id')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('clinic_id')->references('id')->on('clinics')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('treatment_plan_id')->references('id')->on('treatment_plans')->onDelete('set null');
            $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
            $table->foreign('ordering_dentist_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('fitting_specialist_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('fitting_appointment_id')->references('id')->on('appointments')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_orders');
    }
};

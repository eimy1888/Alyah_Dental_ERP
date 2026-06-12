<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('gp_id')->nullable()->comment('General Practitioner (FK users)');
            $table->unsignedBigInteger('initial_appointment_id')->nullable();

            $table->string('title');
            $table->text('diagnosis')->nullable();
            $table->enum('status', ['draft','active','in_progress','pending_lab','completed','cancelled'])->default('draft');

            $table->boolean('requires_lab')->default(false);
            $table->boolean('requires_specialist')->default(false);
            $table->string('specialist_type', 100)->nullable();

            $table->integer('total_sessions_planned')->default(1);
            $table->integer('total_sessions_done')->default(0);

            $table->decimal('deposit_required_pct', 5, 2)->default(50);
            $table->boolean('deposit_paid')->default(false);

            $table->unsignedBigInteger('estimate_invoice_id')->nullable();
            $table->unsignedBigInteger('final_invoice_id')->nullable();

            $table->text('notes')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('clinic_id')->references('id')->on('clinics')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('gp_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('initial_appointment_id')->references('id')->on('appointments')->onDelete('set null');
            $table->foreign('estimate_invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->foreign('final_invoice_id')->references('id')->on('invoices')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_plans');
    }
};

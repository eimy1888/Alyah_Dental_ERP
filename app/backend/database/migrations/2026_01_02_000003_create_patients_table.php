<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();

            // ── Clinic + branch scoping ───────────────────────────────────────
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();

            // ── Optional link to users table (patient portal login) ───────────
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // ── Identity ──────────────────────────────────────────────────────
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable()->unique();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('city')->nullable();
            $table->text('address')->nullable();

            // ── Insurance ─────────────────────────────────────────────────────
            $table->string('insurance_provider')->nullable();
            $table->string('insurance_number')->nullable();

            // ── Medical information ───────────────────────────────────────────
            $table->json('medical_cases')->nullable();
            $table->text('other_conditions')->nullable();

            // ── Status ────────────────────────────────────────────────────────
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');

            // ── Audit ─────────────────────────────────────────────────────────
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // ── Indexes ───────────────────────────────────────────────────────
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['clinic_id', 'status']);
            $table->index('phone');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
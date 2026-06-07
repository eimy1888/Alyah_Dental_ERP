<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('waitlist_entries');

        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->cascadeOnDelete();

            // ── Link to registered patient (optional — walk-ins may not have one) ──
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();

            // ── Basic info (always filled, even for walk-ins) ─────────────────
            $table->string('name');
            $table->string('phone')->nullable();

            // ── Medical cases stored as JSON array ────────────────────────────
            // Each item: { "case": "...", "added_at": "2026-05-24T10:00:00" }
            // Last item = most recent case (current visit reason)
            // All previous items = medical history for this patient on waitlist
            $table->json('medical_cases')->nullable();

            // ── Priority: only normal or urgent ──────────────────────────────
            $table->enum('priority', ['urgent', 'normal'])->default('normal');

            // ── Status ────────────────────────────────────────────────────────
            $table->enum('status', [
                'waiting',
                'called',
                'in_service',
                'done',
                'left',
                'removed',
            ])->default('waiting');

            $table->timestamp('arrived_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // ── Indexes ───────────────────────────────────────────────────────
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['branch_id', 'status']);
            $table->index(['patient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_entries');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TreatmentEpisode — the core entity that groups all clinical actions
 * belonging to ONE medical journey within an appointment.
 *
 * WHY THIS EXISTS:
 *   - One appointment can spawn multiple episodes (staged implants, ortho phases)
 *   - Multiple dentists can act on the same appointment (referral mid-treatment)
 *   - Lab delays keep an episode "open" without holding up other billing
 *   - Insurance is approved per episode, not per appointment
 *   - Invoices link to episodes, not directly to appointments
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_episodes', function (Blueprint $table) {
            $table->id();

            // Tenant + appointment scope
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();

            // Which dentist owns this episode
            // (different from appointment.dentist_id if referred mid-treatment)
            $table->foreignId('dentist_id')->constrained('users')->cascadeOnDelete();

            // Human-readable episode identifier
            // e.g. "Episode 1 — Initial Assessment"
            // e.g. "Episode 2 — Implant Phase 1"
            $table->string('title')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('treatment_plan')->nullable();

            // Episode lifecycle
            $table->enum('status', [
                'open',          // dentist is actively working
                'pending_lab',   // waiting for lab results
                'pending_review',// dentist done, accountant reviewing
                'finalized',     // dentist signed off
                'billed',        // invoice generated and locked
                'cancelled',     // abandoned
            ])->default('open');

            // Episode type determines billing behavior
            $table->enum('episode_type', [
                'service',    // fixed price episode
                'treatment',  // dynamic, procedures build the invoice
                'hybrid',     // both
            ])->default('treatment');

            // Which invoice this episode is billed through
            $table->foreignId('invoice_id')
                ->nullable()
                ->constrained('invoices')
                ->nullOnDelete();

            // For staged treatments: reference to parent episode
            // e.g. Implant Phase 2 links back to Phase 1
            $table->foreignId('parent_episode_id')
                ->nullable()
                ->constrained('treatment_episodes')
                ->nullOnDelete();

            // Phase tracking for staged treatments (1, 2, 3...)
            $table->unsignedTinyInteger('phase_number')->default(1);

            // Financial snapshot at finalization
            $table->decimal('finalized_total', 10, 2)->default(0);

            // Timestamps
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('finalized_at')->nullable();
            $table->foreignId('finalized_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['appointment_id', 'status']);
            $table->index(['patient_id', 'status']);
            $table->index(['dentist_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_episodes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * billing_events — immutable audit log of every billing state change.
 * Nothing is ever deleted from this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_events', function (Blueprint $table) {
            $table->id();

            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('treatment_episode_id')->nullable()->constrained('treatment_episodes')->nullOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('event_type', [
                'invoice_created',
                'episode_opened',
                'procedure_added',
                'procedure_removed',
                'material_consumed',
                'lab_ordered',
                'price_overridden',
                'discount_applied',
                'insurance_applied',
                'prepayment_recorded',
                'payment_recorded',
                'invoice_submitted_for_review',
                'invoice_sent_back',        // accountant rejected review
                'invoice_finalized',
                'invoice_locked',
                'invoice_cancelled',
                'episode_finalized',
                'episode_cancelled',
            ]);

            // Financial impact of this event
            $table->decimal('amount_impact', 10, 2)->default(0);   // +/- change
            $table->decimal('invoice_total_before', 10, 2)->default(0);
            $table->decimal('invoice_total_after', 10, 2)->default(0);

            // Snapshot of relevant data at time of event
            $table->json('metadata')->nullable();

            // Immutable — no updated_at needed
            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index(['invoice_id', 'event_type']);
            $table->index(['appointment_id', 'event_type']);
            $table->index(['treatment_episode_id']);
            $table->index(['clinic_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_events');
    }
};

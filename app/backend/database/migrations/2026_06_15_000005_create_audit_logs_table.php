<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores an immutable audit trail for all platform admin and clinic admin actions.
 * Actors: platform_admin, clinic_admin.
 * Events include: plan assignment, payment recording, subdomain toggle,
 * clinic approve/reject/suspend/reactivate, staff create/delete, etc.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name');           // snapshot at time of action
            $table->string('user_role');           // platform_admin | clinic_admin | etc.

            // Which clinic context (null for platform-level actions that span no clinic)
            $table->foreignId('clinic_id')->nullable()->constrained('clinics')->nullOnDelete();
            $table->string('clinic_name')->nullable(); // snapshot

            // What happened
            $table->string('event');               // e.g. 'clinic.approved', 'plan.assigned'
            $table->string('subject_type')->nullable(); // e.g. 'Clinic', 'Plan', 'Subscription'
            $table->unsignedBigInteger('subject_id')->nullable(); // id of the affected record
            $table->string('subject_label')->nullable(); // human name of the affected record

            // Before/after snapshot (JSON diffs)
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Request metadata
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamp('created_at')->useCurrent();
            // No updated_at — audit logs are immutable

            $table->index(['clinic_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['event', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();

            // ── Link to login account (required) ─────────────────────────────
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // ── Clinic + branch scoping ───────────────────────────────────────
            // These are denormalized here for query performance (filtering staff
            // by branch without always joining users), but user_id is the source
            // of truth. Keep them but don't duplicate name/email/phone/role.
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();

            // ── Professional details (not in users table) ─────────────────────
            $table->string('specialization')->nullable(); // e.g. Orthodontist, Surgeon
            $table->string('working_days')->nullable();   // e.g. Mon,Tue,Wed
            // EAT times stored directly: morning 08:30-12:00, afternoon 13:30-17:00
            $table->string('time_window')->nullable();    // e.g. 08:30-12:00,13:30-17:00

            // ── Showcase fields (for public clinic page) ──────────────────────
            $table->text('bio')->nullable();
            $table->string('photo')->nullable();
            $table->boolean('show_on_showcase')->default(false);

            $table->timestamps();

            $table->unique('user_id'); // one staff record per user
            $table->index(['clinic_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
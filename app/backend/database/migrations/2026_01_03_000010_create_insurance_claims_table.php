<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->cascadeOnDelete();

            // Core relationships
            $table->foreignId('patient_id')
                  ->constrained('patients')
                  ->cascadeOnDelete();

            $table->foreignId('invoice_id')
                  ->nullable()
                  ->constrained('invoices')
                  ->nullOnDelete();

            // Claim details
            $table->string('claim_number')->unique();
            $table->string('insurance_provider');
            $table->string('insurance_number')->nullable();
            $table->decimal('claim_amount', 12, 2);
            $table->decimal('approved_amount', 12, 2)->nullable();
            $table->decimal('paid_amount', 12, 2)->default(0);

            $table->enum('status', [
                'draft',
                'submitted',
                'approved',
                'rejected',
                'paid',
            ])->default('draft');

            // Dates
            $table->date('submitted_at')->nullable();
            $table->date('approved_at')->nullable();
            $table->date('paid_at')->nullable();

            // Documents (JSON array of file paths)
            $table->json('documents')->nullable();

            // Notes
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();

            // Who created
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['clinic_id', 'status']);
            $table->index(['patient_id', 'status']);
            $table->index('claim_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_claims');
    }
};
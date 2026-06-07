<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();

            // Tenant scoping
            $table->foreignId('clinic_id')
                  ->constrained('clinics')
                  ->cascadeOnDelete();

            $table->foreignId('branch_id')
                  ->nullable()
                  ->constrained('branches')
                  ->nullOnDelete();

            // Tax details
            $table->string('name');
            // e.g. "VAT", "Withholding Tax", "Income Tax"

            $table->string('tax_type')->default('VAT');
            // VAT, withholding, income, pension

            $table->decimal('rate', 5, 2)->default(15.00);
            // Percentage e.g. 15.00 for 15% VAT

            $table->decimal('taxable_amount', 12, 2)->default(0);
            // Base amount tax is calculated on

            $table->decimal('amount', 12, 2);
            // Actual tax amount due

            $table->decimal('paid_amount', 12, 2)->default(0);
            // Amount already paid

            // Period this tax covers
            $table->date('period_start');
            $table->date('period_end');
            $table->date('due_date');

            $table->enum('status', [
                'pending',
                'partial',
                'paid',
                'overdue',
            ])->default('pending');

            // Payment reference
            $table->string('payment_reference')->nullable();
            $table->date('paid_at')->nullable();

            $table->text('notes')->nullable();

            // Who created / paid
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->foreignId('paid_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['clinic_id', 'status']);
            $table->index(['clinic_id', 'due_date']);
            $table->index(['clinic_id', 'tax_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxes');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('category');           // rent, salaries, supplies, utilities, equipment, other
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->string('vendor')->nullable();
            $table->date('expense_date');
            $table->string('reference')->nullable();  // receipt number, etc.
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
            ])->default('approved');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['clinic_id', 'expense_date']);
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['clinic_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
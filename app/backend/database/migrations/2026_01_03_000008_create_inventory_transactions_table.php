<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('type', [
                'reorder',       // stock received from supplier
                'usage',         // daily/procedure usage
                'adjustment',    // manual correction
                'expiry_removal',// expired stock removed
                'transfer',      // moved between branches
            ])->default('adjustment');

            $table->integer('quantity_change');   // positive = in, negative = out
            $table->integer('previous_quantity');
            $table->integer('new_quantity');
            $table->string('notes')->nullable();

            $table->timestamp('performed_at')->useCurrent();
            $table->timestamps();

            $table->index(['clinic_id', 'inventory_item_id']);
            $table->index(['clinic_id', 'performed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};
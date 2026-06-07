<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();

            $table->string('name');
            $table->string('sku')->index();
            $table->enum('category', [
                'restorative',
                'consumables',
                'pharmacy',
                'instruments',
            ])->default('consumables');

            $table->string('supplier')->nullable();
            $table->string('location')->nullable();         // cabinet, room, store

            $table->integer('current_quantity')->default(0);
            $table->integer('reorder_threshold')->default(10);
            $table->decimal('unit_cost', 10, 2)->default(0);

            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // SKU unique per clinic
            $table->unique(['clinic_id', 'sku']);
            $table->index(['clinic_id', 'branch_id']);
            $table->index(['clinic_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
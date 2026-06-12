<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * service_inventory_items — pivot linking services/treatments to the
 * inventory items they consume, with quantity per procedure.
 *
 * When a procedure using this service is COMPLETED, the system
 * auto-deducts `quantity_used` from the linked inventory item.
 *
 * Example:
 *   Service: "Root Canal Treatment"
 *     → 2 units "Endodontic Files"
 *     → 1 unit  "Sodium Hypochlorite 5%"
 *     → 1 unit  "Gutta Percha Points"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_inventory_items', function (Blueprint $table) {
            $table->id();

            // Which service/treatment this requirement belongs to
            $table->foreignId('service_id')
                ->constrained('services')
                ->cascadeOnDelete();

            // Which inventory item is consumed
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items')
                ->cascadeOnDelete();

            // How many units are consumed per procedure
            $table->decimal('quantity_used', 8, 2)->default(1);

            // Optional note (e.g. "per tooth", "per session")
            $table->string('notes')->nullable();

            $table->timestamps();

            // A service can only link to each inventory item once
            $table->unique(['service_id', 'inventory_item_id'], 'svc_inv_unique');

            $table->index(['service_id']);
            $table->index(['inventory_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_inventory_items');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend invoice_items for billing v2.
 * Adds source tracking, item_type, projection link, lock, discount.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {

            // What generated this item
            $table->enum('item_type', [
                'service',    // fixed service booked at appointment time
                'procedure',  // dentist-added during treatment
                'material',   // inventory item consumed
                'lab',        // lab order (future)
                'card',       // clinic card registration
                'manual',     // manually added by receptionist/accountant
            ])->default('manual')->after('total');

            // Polymorphic source link (Procedure, InventoryTransaction, etc.)
            $table->string('source_type')->nullable()->after('item_type');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->index(['source_type', 'source_id'], 'ii_source_idx');

            // Link back to the projection line that generated this item
            $table->foreignId('projection_id')
                ->nullable()
                ->after('source_id')
                ->constrained('invoice_projections')
                ->nullOnDelete();

            // Who added it
            $table->foreignId('added_by')
                ->nullable()
                ->after('projection_id')
                ->constrained('users')
                ->nullOnDelete();

            // Locked items cannot be deleted or modified
            $table->boolean('is_locked')->default(false)->after('added_by');

            // Per-item discount
            $table->decimal('discount', 10, 2)->default(0)->after('is_locked');

            // Insurance coverage for this item specifically
            $table->decimal('insurance_coverage', 10, 2)->default(0)->after('discount');

            // Was this item manually overridden?
            $table->boolean('is_price_override')->default(false)->after('insurance_coverage');
            $table->text('override_reason')->nullable()->after('is_price_override');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropForeign(['projection_id']);
            $table->dropForeign(['added_by']);
            $table->dropIndex('ii_source_idx');
            $table->dropColumn([
                'item_type', 'source_type', 'source_id',
                'projection_id', 'added_by', 'is_locked',
                'discount', 'insurance_coverage',
                'is_price_override', 'override_reason',
            ]);
        });
    }
};

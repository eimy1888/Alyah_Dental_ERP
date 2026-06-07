<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * InvoiceProjection — the Billing Projection Layer.
 *
 * WHY THIS EXISTS:
 *   - Procedures should NOT write directly to Invoice records
 *   - There is a middle layer that collects "what is being billed"
 *     before the InvoiceUpdateEngine commits it to the actual Invoice
 *   - This allows: insurance recalculation, discount rules, tax rules,
 *     price overrides, promotional packages — without corrupting live invoices
 *   - The InvoiceUpdateEngine reads from this table and decides
 *     the final committed invoice state
 *
 * FLOW:
 *   Procedure/Lab/Material → ProjectionLine created here
 *   BillingCalculatorService reads all lines for an episode
 *   Applies PricingRules, insurance, discounts
 *   Computes final_unit_price per line
 *   InvoiceUpdateEngine writes to invoice_items using final prices
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_projections', function (Blueprint $table) {
            $table->id();

            // Scope
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('treatment_episode_id')
                ->constrained('treatment_episodes')->cascadeOnDelete();
            $table->foreignId('invoice_id')
                ->nullable()->constrained('invoices')->nullOnDelete();

            // Source of this projection line (polymorphic)
            $table->string('source_type');     // Procedure, InventoryTransaction, LabOrder
            $table->unsignedBigInteger('source_id');
            $table->index(['source_type', 'source_id'], 'ip_source_idx');

            // Item description (mirrors what will become InvoiceItem.description)
            $table->string('description');
            $table->decimal('quantity', 8, 2)->default(1);

            // Pricing pipeline
            $table->decimal('base_unit_price', 10, 2);     // raw service.price
            $table->decimal('modifier_applied', 10, 2)->default(0); // +/- from rules
            $table->decimal('final_unit_price', 10, 2);    // committed price
            $table->decimal('line_total', 10, 2);          // final × qty

            // Which pricing rules were applied (JSON array of rule IDs)
            $table->json('applied_rules')->nullable();

            // Insurance
            $table->decimal('insurance_coverage', 10, 2)->default(0);
            $table->decimal('patient_liability', 10, 2)->default(0); // line_total - coverage

            // Discount
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->string('discount_reason')->nullable();

            // Projection state
            $table->enum('status', [
                'pending',    // created, not yet committed to invoice
                'committed',  // written to invoice_items
                'revised',    // price changed after initial commit
                'removed',    // deleted (will reverse invoice item)
                'overridden', // manual price override applied
            ])->default('pending');

            // Who added and whether it was manually overridden
            $table->foreignId('added_by')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('overridden_by')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('committed_at')->nullable();

            // Link to the committed invoice item (once committed)
            $table->foreignId('invoice_item_id')
                ->nullable()->constrained('invoice_items')->nullOnDelete();

            $table->timestamps();

            $table->index(['treatment_episode_id', 'status']);
            $table->index(['invoice_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_projections');
    }
};

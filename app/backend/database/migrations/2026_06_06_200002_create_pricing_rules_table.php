<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PricingRule — the Pricing Rule Engine data layer.
 *
 * WHY THIS EXISTS:
 *   - Service.price is a BASE price only
 *   - Real clinics apply: branch multipliers, doctor fees, urgency surcharges,
 *     insurance adjustments, promotional discounts, manual overrides
 *   - Without this, accountants become the "calculator system"
 *   - Required for any insurance integration
 *
 * EVALUATION ORDER (lower number = evaluated first, highest priority last):
 *   1. base         — Service.price (default)
 *   2. branch       — Branch-specific override
 *   3. doctor       — Doctor-specific override
 *   4. insurance    — Insurance plan adjustment
 *   5. urgency      — Emergency surcharge
 *   6. promotion    — Active promotion
 *   7. override     — Manual per-appointment override (highest priority)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->id();

            // Tenant scope
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();

            // Rule scope — null means "applies to all"
            $table->foreignId('branch_id')
                ->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('service_id')
                ->nullable()->constrained('services')->nullOnDelete();
            $table->foreignId('dentist_id')        // staff.user_id
                ->nullable()->constrained('users')->nullOnDelete();

            // Rule classification
            $table->enum('rule_type', [
                'base',         // default service price (mirrors service.price)
                'branch',       // branch-specific price
                'doctor',       // doctor-specific fee
                'insurance',    // insurance plan adjustment
                'urgency',      // emergency/after-hours surcharge
                'promotion',    // timed discount
                'override',     // manual per-episode override
            ]);

            // How the rule modifies price
            $table->enum('modifier_type', [
                'fixed',        // replace price entirely with this amount
                'percentage',   // multiply base by (1 + value/100)
                'flat_add',     // add flat amount to base
                'flat_subtract',// subtract flat amount from base
            ])->default('fixed');

            $table->decimal('value', 10, 2);       // the modifier value
            $table->decimal('min_price', 10, 2)->nullable();  // floor
            $table->decimal('max_price', 10, 2)->nullable();  // ceiling

            // Insurance-specific
            $table->string('insurance_provider')->nullable();
            $table->decimal('coverage_percentage', 5, 2)->nullable(); // e.g. 80.00

            // Promotion window
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();

            // Priority (lower = earlier evaluation, higher = wins on conflict)
            $table->unsignedTinyInteger('priority')->default(1);

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            // Who created/approved
            $table->foreignId('created_by')
                ->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['clinic_id', 'rule_type', 'is_active']);
            $table->index(['service_id', 'rule_type']);
            $table->index(['branch_id', 'service_id']);
            $table->index(['valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
    }
};

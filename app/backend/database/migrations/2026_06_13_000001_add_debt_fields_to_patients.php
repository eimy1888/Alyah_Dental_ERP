<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * REQ-15: Add debt tracking fields to patients.
 * has_debt   — flagged when emergency patient leaves without paying
 * debt_amount — outstanding balance from emergency non-payment
 * debt_invoice_id — the specific invoice that is unpaid
 * debt_flagged_at / debt_flagged_by — audit trail
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->boolean('has_debt')->default(false)->after('card_is_active');
            $table->decimal('debt_amount', 10, 2)->default(0)->after('has_debt');
            $table->unsignedBigInteger('debt_invoice_id')->nullable()->after('debt_amount');
            $table->timestamp('debt_flagged_at')->nullable()->after('debt_invoice_id');
            $table->unsignedBigInteger('debt_flagged_by')->nullable()->after('debt_flagged_at');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['has_debt', 'debt_amount', 'debt_invoice_id', 'debt_flagged_at', 'debt_flagged_by']);
        });
    }
};

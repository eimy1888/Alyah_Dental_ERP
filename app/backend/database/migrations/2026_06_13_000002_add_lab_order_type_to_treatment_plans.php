<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add lab_order_type and invoice_id to treatment_plans.
 * lab_order_type: the fabrication type (crown, bridge, etc.) for auto lab order creation
 * invoice_id: the single treatment invoice for this plan (simplifies the old estimate/final dual invoice)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treatment_plans', function (Blueprint $table) {
            $table->string('lab_order_type', 50)->nullable()->after('requires_lab');
            $table->string('lab_material', 100)->nullable()->after('lab_order_type');
            $table->unsignedBigInteger('invoice_id')->nullable()->after('estimate_invoice_id');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('treatment_plans', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->dropColumn(['lab_order_type', 'lab_material', 'invoice_id']);
        });
    }
};

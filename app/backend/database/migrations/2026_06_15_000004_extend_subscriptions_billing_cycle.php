<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds 'days' as a billing_cycle option (for free plans)
 * and adds payment_date to subscriptions.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Laravel's DBAL does not support modifying enum on some drivers natively;
        // we recreate the column via a raw approach compatible with MySQL.
        \DB::statement("ALTER TABLE subscriptions MODIFY COLUMN billing_cycle ENUM('days','monthly','annual') DEFAULT 'monthly'");

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->date('payment_date')->nullable()->after('payment_reference')
                ->comment('Date payment was received by platform admin');
        });
    }

    public function down(): void
    {
        \DB::statement("ALTER TABLE subscriptions MODIFY COLUMN billing_cycle ENUM('monthly','annual') DEFAULT 'monthly'");

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('payment_date');
        });
    }
};

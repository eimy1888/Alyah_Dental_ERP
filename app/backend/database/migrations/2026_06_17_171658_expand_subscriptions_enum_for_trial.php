<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Expand subscription enums to support 14-day free trial flow.
     *
     * billing_cycle: adds 'trial'
     * payment_method: adds 'none' (free plan — no payment method needed)
     * status: adds 'trialing' (active trial, not yet billed)
     */
    public function up(): void
    {
        // MySQL ALTER COLUMN for ENUMs
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN billing_cycle ENUM('monthly','annual','trial') NOT NULL DEFAULT 'monthly'");
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN payment_method ENUM('telebirr','chapa','paypal','bank_transfer','free_trial','none') NULL");
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN status ENUM('pending','trialing','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Revert to original enums (only safe if no 'trial'/'trialing'/'none' rows exist)
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN billing_cycle ENUM('monthly','annual') NOT NULL DEFAULT 'monthly'");
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN payment_method ENUM('telebirr','chapa','paypal','bank_transfer','free_trial') NULL");
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN status ENUM('pending','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending'");
    }
};

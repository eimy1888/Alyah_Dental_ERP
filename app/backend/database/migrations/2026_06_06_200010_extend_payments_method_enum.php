<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Extend payments.method enum to include 'card' and 'cbe_birr'.
 * Safe additive change — existing values unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN method ENUM(
            'cash',
            'telebirr',
            'cbe_birr',
            'chapa',
            'bank_transfer',
            'insurance',
            'card'
        ) NOT NULL DEFAULT 'cash'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN method ENUM(
            'cash',
            'telebirr',
            'chapa',
            'bank_transfer',
            'insurance'
        ) NOT NULL DEFAULT 'cash'");
    }
};

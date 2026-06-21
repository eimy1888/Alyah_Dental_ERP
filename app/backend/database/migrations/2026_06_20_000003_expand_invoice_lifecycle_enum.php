<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoices') || DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE invoices MODIFY COLUMN invoice_type ENUM('card','service','treatment','hybrid','diagnostic') NULL DEFAULT 'service'");
        DB::statement("ALTER TABLE invoices MODIFY COLUMN lifecycle_status ENUM('draft','estimated','unpaid','in_progress','updated','final','under_review','locked','paid','partial','overdue','cancelled') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoices') || DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("UPDATE invoices SET lifecycle_status = 'estimated' WHERE lifecycle_status = 'unpaid'");
        DB::statement("UPDATE invoices SET invoice_type = 'treatment' WHERE invoice_type = 'diagnostic'");
        DB::statement("ALTER TABLE invoices MODIFY COLUMN invoice_type ENUM('card','service','treatment','hybrid') NULL DEFAULT 'service'");
        DB::statement("ALTER TABLE invoices MODIFY COLUMN lifecycle_status ENUM('draft','estimated','in_progress','updated','final','under_review','locked','paid','partial','overdue','cancelled') NOT NULL DEFAULT 'draft'");
    }
};

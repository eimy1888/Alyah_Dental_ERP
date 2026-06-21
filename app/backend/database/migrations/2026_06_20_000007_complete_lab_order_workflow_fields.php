<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('lab_orders', 'attachments')) {
                $table->json('attachments')->nullable()->after('instructions');
            }
            if (!Schema::hasColumn('lab_orders', 'lab_notes')) {
                $table->text('lab_notes')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('lab_orders', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('actual_ready_date');
            }
            if (!Schema::hasColumn('lab_orders', 'dentist_acknowledged_at')) {
                $table->timestamp('dentist_acknowledged_at')->nullable()->after('delivered_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            foreach (['attachments', 'lab_notes', 'delivered_at', 'dentist_acknowledged_at'] as $column) {
                if (Schema::hasColumn('lab_orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

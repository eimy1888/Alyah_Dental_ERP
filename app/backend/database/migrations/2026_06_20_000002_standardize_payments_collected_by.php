<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('payments', 'recorded_by')) {
            return;
        }

        if (Schema::hasColumn('payments', 'collected_by')) {
            DB::table('payments')
                ->whereNull('collected_by')
                ->whereNotNull('recorded_by')
                ->update(['collected_by' => DB::raw('recorded_by')]);
        }

        Schema::table('payments', function (Blueprint $table) {
            try {
                $table->dropForeign(['recorded_by']);
            } catch (Throwable $e) {
                //
            }

            $table->dropColumn('recorded_by');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'recorded_by')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('recorded_by')->nullable()->after('collected_by')->constrained('users')->nullOnDelete();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE treatment_plans MODIFY COLUMN status ENUM('draft','proposed','approved','rejected','active','in_progress','pending_lab','completed','cancelled') NOT NULL DEFAULT 'draft'");
        }

        Schema::table('treatment_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_plans', 'estimated_cost')) {
                $table->decimal('estimated_cost', 10, 2)->default(0)->after('diagnosis');
            }
            if (!Schema::hasColumn('treatment_plans', 'revision_number')) {
                $table->unsignedInteger('revision_number')->default(1)->after('estimated_cost');
            }
            if (!Schema::hasColumn('treatment_plans', 'revision_notes')) {
                $table->text('revision_notes')->nullable()->after('revision_number');
            }
            if (!Schema::hasColumn('treatment_plans', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('completed_at');
            }
            if (!Schema::hasColumn('treatment_plans', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('approved_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('treatment_plans', function (Blueprint $table) {
            foreach (['estimated_cost', 'revision_number', 'revision_notes', 'approved_at', 'rejected_at'] as $column) {
                if (Schema::hasColumn('treatment_plans', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE treatment_plans MODIFY COLUMN status ENUM('draft','active','in_progress','pending_lab','completed','cancelled') NOT NULL DEFAULT 'draft'");
        }
    }
};

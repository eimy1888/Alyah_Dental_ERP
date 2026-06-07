<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Extend invoices table for dual billing v2.
 * Every column is guarded with hasColumn() to be safe against partial runs.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add each column only if it doesn't already exist
        // This makes the migration idempotent — safe to re-run after partial failure

        Schema::table('invoices', function (Blueprint $table) {

            if (!Schema::hasColumn('invoices', 'treatment_episode_id')) {
                $table->foreignId('treatment_episode_id')
                    ->nullable()->after('created_by')
                    ->constrained('treatment_episodes')->nullOnDelete();
            }

            if (!Schema::hasColumn('invoices', 'appointment_id')) {
                $table->foreignId('appointment_id')
                    ->nullable()->after('treatment_episode_id')
                    ->constrained('appointments')->nullOnDelete();
            }

            if (!Schema::hasColumn('invoices', 'invoice_type')) {
                $table->enum('invoice_type', ['card','service','treatment','hybrid'])
                    ->default('service')->after('appointment_id');
            }

            if (!Schema::hasColumn('invoices', 'lifecycle_status')) {
                $table->enum('lifecycle_status', [
                    'draft','estimated','in_progress','updated','final',
                    'under_review','locked','paid','partial','overdue','cancelled',
                ])->default('draft')->after('invoice_type');
            }

            if (!Schema::hasColumn('invoices', 'pre_paid')) {
                $table->decimal('pre_paid', 10, 2)->default(0)->after('balance');
            }

            if (!Schema::hasColumn('invoices', 'estimated_total')) {
                $table->decimal('estimated_total', 10, 2)->default(0)->after('pre_paid');
            }

            if (!Schema::hasColumn('invoices', 'discount_total')) {
                $table->decimal('discount_total', 10, 2)->default(0)->after('estimated_total');
            }

            if (!Schema::hasColumn('invoices', 'tax_amount')) {
                $table->decimal('tax_amount', 10, 2)->default(0)->after('discount_total');
            }

            if (!Schema::hasColumn('invoices', 'tax_rate')) {
                $table->decimal('tax_rate', 5, 2)->default(15.00)->after('tax_amount');
            }

            if (!Schema::hasColumn('invoices', 'insurance_coverage')) {
                $table->decimal('insurance_coverage', 10, 2)->default(0)->after('tax_rate');
            }

            if (!Schema::hasColumn('invoices', 'finalized_at')) {
                $table->timestamp('finalized_at')->nullable()->after('due_date');
            }

            if (!Schema::hasColumn('invoices', 'finalized_by')) {
                $table->foreignId('finalized_by')
                    ->nullable()->after('finalized_at')
                    ->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('invoices', 'submitted_for_review_at')) {
                $table->timestamp('submitted_for_review_at')->nullable()->after('finalized_at');
            }

            if (!Schema::hasColumn('invoices', 'review_notes')) {
                $table->text('review_notes')->nullable()->after('submitted_for_review_at');
            }

            if (!Schema::hasColumn('invoices', 'locked_at')) {
                $table->timestamp('locked_at')->nullable()->after('review_notes');
            }

            if (!Schema::hasColumn('invoices', 'locked_by')) {
                $table->foreignId('locked_by')
                    ->nullable()->after('locked_at')
                    ->constrained('users')->nullOnDelete();
            }
        });

        // Add indexes only if they don't exist
        $indexes = DB::select("SHOW INDEX FROM invoices WHERE Key_name IN ('invoices_clinic_id_lifecycle_status_index','invoices_treatment_episode_id_index')");
        $existingIndexNames = collect($indexes)->pluck('Key_name')->toArray();

        Schema::table('invoices', function (Blueprint $table) use ($existingIndexNames) {
            if (!in_array('invoices_clinic_id_lifecycle_status_index', $existingIndexNames)) {
                $table->index(['clinic_id', 'lifecycle_status']);
            }
            if (!in_array('invoices_treatment_episode_id_index', $existingIndexNames)) {
                $table->index(['treatment_episode_id']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            try { $table->dropForeign(['treatment_episode_id']); } catch (\Throwable $e) {}
            try { $table->dropForeign(['finalized_by']); }       catch (\Throwable $e) {}
            try { $table->dropForeign(['locked_by']); }          catch (\Throwable $e) {}
            try { $table->dropIndex(['clinic_id', 'lifecycle_status']); } catch (\Throwable $e) {}
            try { $table->dropIndex(['treatment_episode_id']); }          catch (\Throwable $e) {}

            $cols = [
                'treatment_episode_id','invoice_type','lifecycle_status',
                'pre_paid','estimated_total','discount_total',
                'tax_amount','tax_rate','insurance_coverage',
                'finalized_at','finalized_by',
                'submitted_for_review_at','review_notes',
                'locked_at','locked_by',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('invoices', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

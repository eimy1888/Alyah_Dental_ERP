<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('prescriptions', 'date')) {
                $table->date('date')->nullable()->after('appointment_id');
            }
            if (!Schema::hasColumn('prescriptions', 'notes')) {
                $table->text('notes')->nullable()->after('date');
            }
            if (!Schema::hasColumn('prescriptions', 'status')) {
                $table->string('status')->default('draft')->after('notes');
            }
            if (!Schema::hasColumn('prescriptions', 'finalized_at')) {
                $table->timestamp('finalized_at')->nullable()->after('status');
            }
        });

        if (!Schema::hasTable('prescription_items')) {
            Schema::create('prescription_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
                $table->string('drug_name');
                $table->string('dosage')->nullable();
                $table->string('frequency')->nullable();
                $table->string('duration')->nullable();
                $table->text('instructions')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('x_rays', function (Blueprint $table) {
            if (!Schema::hasColumn('x_rays', 'uploaded_by')) {
                $table->foreignId('uploaded_by')->nullable()->after('appointment_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('x_rays', 'description')) {
                $table->text('description')->nullable()->after('file_size');
            }
            if (!Schema::hasColumn('x_rays', 'taken_at')) {
                $table->timestamp('taken_at')->nullable()->after('captured_at');
            }
        });

        Schema::table('clinical_notes', function (Blueprint $table) {
            if (!Schema::hasColumn('clinical_notes', 'title')) {
                $table->string('title')->nullable()->after('appointment_id');
            }
            if (!Schema::hasColumn('clinical_notes', 'note')) {
                $table->text('note')->nullable()->after('title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clinical_notes', function (Blueprint $table) {
            if (Schema::hasColumn('clinical_notes', 'note')) {
                $table->dropColumn('note');
            }
            if (Schema::hasColumn('clinical_notes', 'title')) {
                $table->dropColumn('title');
            }
        });

        Schema::table('x_rays', function (Blueprint $table) {
            if (Schema::hasColumn('x_rays', 'uploaded_by')) {
                $table->dropConstrainedForeignId('uploaded_by');
            }
            if (Schema::hasColumn('x_rays', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('x_rays', 'taken_at')) {
                $table->dropColumn('taken_at');
            }
        });

        Schema::dropIfExists('prescription_items');

        Schema::table('prescriptions', function (Blueprint $table) {
            foreach (['date', 'notes', 'status', 'finalized_at'] as $column) {
                if (Schema::hasColumn('prescriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

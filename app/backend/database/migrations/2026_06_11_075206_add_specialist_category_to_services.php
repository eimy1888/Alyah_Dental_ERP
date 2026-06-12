<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('specialist_category')->nullable()->after('category');
            $table->boolean('is_diagnostic')->default(false)->after('specialist_category');
            $table->boolean('requires_fab_lab')->default(false)->after('is_diagnostic');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['specialist_category', 'is_diagnostic', 'requires_fab_lab']);
        });
    }
};

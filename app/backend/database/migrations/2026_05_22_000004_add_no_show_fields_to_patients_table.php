<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->integer('no_show_count')->default(0)->after('status');
            $table->boolean('requires_deposit')->default(false)->after('no_show_count');
            $table->boolean('is_blocked')->default(false)->after('requires_deposit');
            $table->text('medical_alerts')->nullable()->after('is_blocked');
            $table->boolean('vip')->default(false)->after('medical_alerts');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['no_show_count', 'requires_deposit', 'is_blocked', 'medical_alerts', 'vip']);
        });
    }
};
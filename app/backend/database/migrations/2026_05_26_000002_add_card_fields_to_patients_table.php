<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('card_number')->unique()->nullable()->after('id');
            $table->boolean('has_card')->default(false)->after('card_number');
            $table->boolean('card_is_active')->default(true)->after('has_card');
            $table->timestamp('last_no_show_at')->nullable()->after('requires_deposit');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['card_number', 'has_card', 'card_is_active', 'last_no_show_at']);
        });
    }
};
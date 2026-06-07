<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->boolean('is_available')->default(true)->after('time_window');
            $table->string('unavailable_reason')->nullable()->after('is_available');
            $table->timestamp('unavailable_until')->nullable()->after('unavailable_reason');
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->dropColumn(['is_available', 'unavailable_reason', 'unavailable_until']);
        });
    }
};
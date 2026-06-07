<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dateTime('check_in_time')->nullable()->after('appointment_time');
            $table->dateTime('start_time')->nullable()->after('check_in_time');
            $table->dateTime('end_time')->nullable()->after('start_time');
            $table->boolean('is_late')->default(false)->after('end_time');
            $table->integer('late_minutes')->default(0)->after('is_late');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['check_in_time', 'start_time', 'end_time', 'is_late', 'late_minutes']);
        });
    }
};
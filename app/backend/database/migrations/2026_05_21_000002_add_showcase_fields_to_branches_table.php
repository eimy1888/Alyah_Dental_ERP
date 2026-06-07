<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'working_hours')) {
                $table->json('working_hours')->nullable()->after('status');
            }
            if (!Schema::hasColumn('branches', 'map_link')) {
                $table->string('map_link')->nullable()->after('working_hours');
            }
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['working_hours', 'map_link']);
        });
    }
};
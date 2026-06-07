<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (!Schema::hasColumn('staff', 'photo_url')) {
                $table->string('photo_url')->nullable()->after('time_window');
            }
            if (!Schema::hasColumn('staff', 'bio')) {
                $table->text('bio')->nullable()->after('photo_url');
            }
            if (!Schema::hasColumn('staff', 'specialties')) {
                $table->json('specialties')->nullable()->after('bio');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->dropColumn(['photo_url', 'bio', 'specialties']);
        });
    }
};
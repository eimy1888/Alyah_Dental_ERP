<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds subdomain_active flag to clinics for platform admin access control.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->boolean('subdomain_active')->default(true)->after('subdomain')
                ->comment('Platform admin can disable/enable this clinic\'s subdomain access');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn('subdomain_active');
        });
    }
};

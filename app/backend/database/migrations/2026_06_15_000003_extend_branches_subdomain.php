<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds subdomain + subdomain_active to branches.
 * Each branch gets its own subdomain identifier and can be
 * independently enabled/disabled by the platform admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('subdomain')->nullable()->unique()->after('name')
                ->comment('Unique subdomain identifier, e.g. branch-slug.clinic-subdomain');
            $table->boolean('subdomain_active')->default(true)->after('subdomain')
                ->comment('Platform admin can disable/enable this branch\'s subdomain access');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['subdomain', 'subdomain_active']);
        });
    }
};

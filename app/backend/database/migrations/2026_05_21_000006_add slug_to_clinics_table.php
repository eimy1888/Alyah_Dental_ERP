<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (!Schema::hasColumn('clinics', 'slug')) {
                $table->string('slug')->unique()->nullable()->after('subdomain');
            }
        });
        
        // Update existing clinics with slug from subdomain or name
        $clinics = \App\Models\Clinic::all();
        foreach ($clinics as $clinic) {
            $clinic->slug = $clinic->subdomain ?? Str::slug($clinic->name);
            $clinic->saveQuietly();
        }
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // Basic, Pro, Enterprise
            $table->string('slug')->unique();                // basic, pro, enterprise
            $table->decimal('monthly_price', 10, 2);
            $table->decimal('annual_price', 10, 2);
            $table->unsignedInteger('max_users');
            $table->unsignedInteger('max_branches');
            $table->unsignedInteger('max_storage_gb');
            $table->json('features');                        // list of feature strings
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};

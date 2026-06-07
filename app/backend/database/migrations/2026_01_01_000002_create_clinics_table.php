<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('subdomain')->unique()->nullable();   // e.g. nile-smile
            $table->string('email')->unique();
            $table->string('phone');
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Ethiopia');
            $table->enum('status', [
                'pending_payment',          // just registered, not paid yet
                'pending_platform_approval',// paid, waiting for platform admin to approve
                'active',                   // approved and live
                'suspended',                // platform admin suspended
                'rejected',                 // platform admin rejected
            ])->default('pending_payment');
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->json('settings')->nullable();               // invoice_prefix, theme, etc.
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinics');
    }
};

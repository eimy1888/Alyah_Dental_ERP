<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans');
            $table->enum('billing_cycle', ['monthly', 'annual'])->default('monthly');
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->enum('payment_method', [
                'telebirr',
                'chapa',
                'paypal',
                'bank_transfer',
                'free_trial',
            ])->nullable();
            $table->string('payment_reference')->nullable();    // transaction ID from gateway
            $table->enum('status', [
                'pending',      // payment not done yet
                'active',       // paid and approved
                'past_due',     // payment failed on renewal
                'cancelled',    // manually cancelled
                'expired',      // subscription period ended
            ])->default('pending');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

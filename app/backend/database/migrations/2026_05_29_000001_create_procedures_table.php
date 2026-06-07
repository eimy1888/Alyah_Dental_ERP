<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procedures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('appointment_id')->constrained()->onDelete('cascade');
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('dentist_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_item_id')->nullable()->constrained('invoice_items')->nullOnDelete();
            
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->decimal('price', 10, 2)->default(0);
            $table->string('tooth_number')->nullable();
            $table->text('notes')->nullable();
            $table->json('materials_used')->nullable();
            
            $table->enum('status', ['planned', 'performed', 'cancelled'])->default('performed');
            $table->timestamps();
            
            $table->index(['appointment_id', 'status']);
            $table->index(['patient_id', 'created_at']);
            $table->index(['dentist_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procedures');
    }
};
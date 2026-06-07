<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');                    // Notification class name
            $table->morphs('notifiable');              // notifiable_type + notifiable_id (User)
            $table->text('data');                      // JSON payload
            $table->timestamp('read_at')->nullable();  // null = unread
            $table->timestamps();

            // Fast lookup: all unread for a user
            $table->index(['notifiable_id', 'notifiable_type', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
<?php

use App\Models\QueueItem;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            if (!Schema::hasColumn('queue_items', 'active_queue_key')) {
                $table->string('active_queue_key')->nullable()->after('appointment_id');
            }
        });

        QueueItem::withTrashed()
            ->whereNotNull('appointment_id')
            ->whereIn('status', QueueItem::activeStatuses())
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get()
            ->groupBy('appointment_id')
            ->each(function ($items) {
                $items->values()->each(function (QueueItem $item, int $index) {
                    $item->active_queue_key = $index === 0 ? (string) $item->appointment_id : null;
                    if ($index > 0) {
                        $item->status = QueueItem::STATUS_REMOVED;
                        $item->completed_at = $item->completed_at ?? now();
                    }
                    $item->saveQuietly();
                });
            });

        Schema::table('queue_items', function (Blueprint $table) {
            $table->unique('active_queue_key', 'queue_items_active_queue_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            $table->dropUnique('queue_items_active_queue_key_unique');
            $table->dropColumn('active_queue_key');
        });
    }
};

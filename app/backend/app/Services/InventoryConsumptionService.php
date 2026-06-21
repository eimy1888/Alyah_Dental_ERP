<?php

namespace App\Services;

use App\Models\InventoryTransaction;
use App\Models\Procedure;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryConsumptionService
{
    public function consumeForProcedure(Procedure $procedure, User $actor): void
    {
        if (!$procedure->service_id) {
            return;
        }

        if (InventoryTransaction::where('procedure_id', $procedure->id)->where('type', 'usage')->exists()) {
            return;
        }

        $procedure->loadMissing('service.inventoryItems');

        DB::transaction(function () use ($procedure, $actor) {
            foreach ($procedure->service->inventoryItems as $item) {
                if ((int) $item->clinic_id !== (int) $procedure->clinic_id) {
                    continue;
                }

                $qty = (float) $item->pivot->quantity_used;
                if ($qty <= 0) {
                    continue;
                }

                $item->refresh();
                $previous = (int) $item->current_quantity;
                $new = max(0, $previous - (int) ceil($qty));

                $item->update(['current_quantity' => $new]);

                InventoryTransaction::create([
                    'clinic_id' => $procedure->clinic_id,
                    'branch_id' => $procedure->branch_id,
                    'inventory_item_id' => $item->id,
                    'procedure_id' => $procedure->id,
                    'performed_by' => $actor->id,
                    'type' => 'usage',
                    'quantity_change' => $new - $previous,
                    'previous_quantity' => $previous,
                    'new_quantity' => $new,
                    'notes' => "Consumed by procedure #{$procedure->id}: {$procedure->name}",
                    'performed_at' => now(),
                ]);

                if ($new <= (int) $item->reorder_threshold) {
                    NotificationService::inventoryLowStock($item);
                }
            }
        });
    }

    public function restoreForProcedure(Procedure $procedure, User $actor): void
    {
        DB::transaction(function () use ($procedure, $actor) {
            InventoryTransaction::where('procedure_id', $procedure->id)
                ->where('type', 'usage')
                ->get()
                ->each(function (InventoryTransaction $transaction) use ($actor, $procedure) {
                    $item = $transaction->inventoryItem;
                    if (!$item) {
                        return;
                    }

                    $previous = (int) $item->current_quantity;
                    $restore = abs((int) $transaction->quantity_change);
                    $new = $previous + $restore;

                    $item->update(['current_quantity' => $new]);

                    InventoryTransaction::create([
                        'clinic_id' => $transaction->clinic_id,
                        'branch_id' => $transaction->branch_id,
                        'inventory_item_id' => $transaction->inventory_item_id,
                        'procedure_id' => $procedure->id,
                        'performed_by' => $actor->id,
                        'type' => 'adjustment',
                        'quantity_change' => $restore,
                        'previous_quantity' => $previous,
                        'new_quantity' => $new,
                        'notes' => "Restored after procedure #{$procedure->id} removal",
                        'performed_at' => now(),
                    ]);
                });
        });
    }
}

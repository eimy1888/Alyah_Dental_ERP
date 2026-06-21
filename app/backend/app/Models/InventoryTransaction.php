<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'inventory_item_id',
        'procedure_id',
        'performed_by',
        'type',
        'quantity_change',
        'previous_quantity',
        'new_quantity',
        'notes',
        'performed_at',
    ];

    protected $casts = [
        'quantity_change'   => 'integer',
        'previous_quantity' => 'integer',
        'new_quantity'      => 'integer',
        'performed_at'      => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function procedure(): BelongsTo
    {
        return $this->belongsTo(Procedure::class);
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isInbound(): bool
    {
        return $this->quantity_change > 0;
    }

    public function isOutbound(): bool
    {
        return $this->quantity_change < 0;
    }

    public function formattedChange(): string
    {
        return $this->quantity_change > 0
            ? "+{$this->quantity_change}"
            : (string) $this->quantity_change;
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForItem($query, int $itemId)
    {
        return $query->where('inventory_item_id', $itemId);
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('performed_at', '>=', now()->subDays($days));
    }
}

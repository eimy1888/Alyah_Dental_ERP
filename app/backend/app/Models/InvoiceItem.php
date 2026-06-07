<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    // ── Item type constants ───────────────────────────────────────────────────
    const TYPE_SERVICE   = 'service';    // fixed service booked at appointment
    const TYPE_PROCEDURE = 'procedure';  // dentist-added during treatment
    const TYPE_MATERIAL  = 'material';   // inventory consumption
    const TYPE_LAB       = 'lab';        // lab order
    const TYPE_CARD      = 'card';       // clinic card registration
    const TYPE_MANUAL    = 'manual';     // receptionist/accountant manual entry

    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_price',
        'total',
        // v2 fields
        'item_type',
        'source_type',
        'source_id',
        'projection_id',
        'added_by',
        'is_locked',
        'discount',
        'insurance_coverage',
        'is_price_override',
        'override_reason',
    ];

    protected $casts = [
        'unit_price'         => 'decimal:2',
        'total'              => 'decimal:2',
        'discount'           => 'decimal:2',
        'insurance_coverage' => 'decimal:2',
        'is_locked'          => 'boolean',
        'is_price_override'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $item) {
            // Auto-calculate line total (net of item-level discount)
            $gross         = $item->quantity * $item->unit_price;
            $itemDiscount  = (float) ($item->discount ?? 0);
            $item->total   = max(0, $gross - $itemDiscount);
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function projection(): BelongsTo
    {
        return $this->belongsTo(InvoiceProjection::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    // ── Business Logic ────────────────────────────────────────────────────────

    public function canDelete(): bool
    {
        return !(bool) $this->is_locked;
    }

    public function canEdit(): bool
    {
        return !(bool) $this->is_locked && !(bool) $this->is_price_override;
    }
}

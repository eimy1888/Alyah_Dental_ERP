<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'name',
        'sku',
        'category',
        'supplier',
        'location',
        'current_quantity',
        'reorder_threshold',
        'unit_cost',
        'expiry_date',
        'is_active',
    ];

    protected $casts = [
        'expiry_date'        => 'date',
        'unit_cost'          => 'decimal:2',
        'current_quantity'   => 'integer',
        'reorder_threshold'  => 'integer',
        'is_active'          => 'boolean',
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

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    // ── Computed: stock status ────────────────────────────────────────────────

    public function getStatusAttribute(): string
    {
        if ($this->current_quantity <= 0) {
            return 'out_of_stock';
        }

        if ($this->current_quantity < $this->reorder_threshold) {
            return 'low';
        }

        // Watch expiry — within 90 days
        if ($this->expiry_date && $this->expiry_date->diffInDays(now()) <= 90) {
            return 'watch';
        }

        return 'healthy';
    }

    // ── Computed: total stock value ───────────────────────────────────────────

    public function getStockValueAttribute(): float
    {
        return round($this->current_quantity * $this->unit_cost, 2);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('current_quantity', '<', 'reorder_threshold');
    }

    public function scopeExpiringWithin($query, int $days = 90)
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', now()->addDays($days));
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
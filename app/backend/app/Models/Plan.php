<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'duration_days',
        'duration_value',
        'duration_unit',
        'monthly_price',
        'annual_price',
        'max_users',
        'max_branches',
        'max_storage_gb',
        'features',
        'is_active',
    ];

    protected $casts = [
        'type'           => 'string',
        'duration_days'  => 'integer',
        'duration_value' => 'integer',
        'duration_unit'  => 'string',
        'monthly_price'  => 'decimal:2',
        'annual_price'   => 'decimal:2',
        'max_users'      => 'integer',
        'max_branches'   => 'integer',
        'max_storage_gb' => 'integer',
        'features'       => 'array',
        'is_active'      => 'boolean',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }

 public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(\App\Models\Subscription::class);
}

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isFree(): bool
    {
        return $this->type === 'free';
    }

    public function isPaid(): bool
    {
        return $this->type === 'paid';
    }

    /**
     * Calculate the ends_at timestamp for a new subscription based on billing cycle.
     */
    public function calculateEndsAt(string $billingCycle): \Carbon\Carbon
    {
        $now = now();

        if ($this->isFree()) {
            return $now->copy()->addDays($this->duration_days ?? 30);
        }

        return match ($billingCycle) {
            'annual'  => $now->copy()->addDays(365),
            'monthly' => $now->copy()->addDays(30),
            default   => $now->copy()->addDays($this->duration_days ?? 30),
        };
    }

    /**
     * Return the price for a given billing cycle.
     */
    public function priceFor(string $billingCycle): float
    {
        if ($this->isFree()) {
            return 0.00;
        }

        return match ($billingCycle) {
            'annual'  => (float) $this->annual_price,
            'monthly' => (float) $this->monthly_price,
            default   => (float) $this->monthly_price,
        };
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFree($query)
    {
        return $query->where('type', 'free');
    }

    public function scopePaid($query)
    {
        return $query->where('type', 'paid');
    }
}
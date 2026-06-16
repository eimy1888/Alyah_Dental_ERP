<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'plan_id',
        'billing_cycle',
        'amount_paid',
        'payment_method',
        'payment_reference',
        'payment_date',
        'status',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'amount_paid'  => 'decimal:2',
        'starts_at'    => 'datetime',
        'ends_at'      => 'datetime',
        'payment_date' => 'date',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired'
            || ($this->ends_at && $this->ends_at->isPast());
    }

    /**
     * Days remaining until expiry. Returns 0 if already expired.
     */
    public function daysRemaining(): int
    {
        if (!$this->ends_at || $this->ends_at->isPast()) {
            return 0;
        }

        return (int) now()->diffInDays($this->ends_at, false);
    }

    /**
     * Calculate the end date based on billing cycle and plan.
     * Pass $plan to correctly resolve 'days' cycle duration.
     */
    public static function calculateEndsAt(string $billingCycle, \Carbon\Carbon $startsAt, ?\App\Models\Plan $plan = null): \Carbon\Carbon
    {
        return match ($billingCycle) {
            'annual'  => $startsAt->copy()->addDays(365),
            'monthly' => $startsAt->copy()->addDays(30),
            'days'    => $startsAt->copy()->addDays($plan?->duration_days ?? 30),
            default   => $startsAt->copy()->addDays(30),
        };
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeDue($query)
    {
        return $query->where('status', 'active')
            ->where('ends_at', '<=', now());
    }
}
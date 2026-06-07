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
        'status',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
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

    /**
     * Calculate the end date based on billing cycle.
     */
    public static function calculateEndsAt(string $billingCycle, \Carbon\Carbon $startsAt): \Carbon\Carbon
    {
        return $billingCycle === 'annual'
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonth();
    }
}
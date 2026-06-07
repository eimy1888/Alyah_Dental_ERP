<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'invoice_id',
        'patient_id',
        'collected_by',
        'amount',
        'method',
        'reference',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function collectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    // ── Accessor: support both 'method' and 'payment_method' ─────────────────
    // Various controllers pass payment_method in the fillable array.
    // This accessor ensures $payment->payment_method always works.

    public function getPaymentMethodAttribute(): ?string
    {
        return $this->method;
    }

    public function setPaymentMethodAttribute(string $value): void
    {
        $this->attributes['method'] = $value;
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tax extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'name',
        'tax_type',
        'rate',
        'taxable_amount',
        'amount',
        'paid_amount',
        'period_start',
        'period_end',
        'due_date',
        'status',
        'payment_reference',
        'paid_at',
        'notes',
        'created_by',
        'paid_by',
    ];

    protected $casts = [
        'rate'              => 'decimal:2',
        'taxable_amount'    => 'decimal:2',
        'amount'            => 'decimal:2',
        'paid_amount'       => 'decimal:2',
        'period_start'      => 'date',
        'period_end'        => 'date',
        'due_date'          => 'date',
        'paid_at'           => 'date',
    ];

    // ── Tax type constants ─────────────────────────────────
    const TYPE_VAT         = 'VAT';
    const TYPE_WITHHOLDING = 'withholding';
    const TYPE_INCOME      = 'income';
    const TYPE_PENSION     = 'pension';

    // ── Status constants ───────────────────────────────────
    const STATUS_PENDING  = 'pending';
    const STATUS_PARTIAL  = 'partial';
    const STATUS_PAID     = 'paid';
    const STATUS_OVERDUE  = 'overdue';

    // ── Auto update overdue status ─────────────────────────
    protected static function booted(): void
    {
        static::retrieved(function ($tax) {
            if (
                $tax->status === self::STATUS_PENDING &&
                $tax->due_date->isPast()
            ) {
                $tax->updateQuietly(['status' => self::STATUS_OVERDUE]);
            }
        });
    }

    // ── Relationships ──────────────────────────────────────

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paidBy()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    // ── Scopes ────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        if ($branchId === null) {
            return $query;
        }
        return $query->where('branch_id', $branchId);
    }

    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING,
            self::STATUS_PARTIAL,
        ]);
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', self::STATUS_OVERDUE)
                     ->orWhere(function ($q) {
                         $q->where('status', self::STATUS_PENDING)
                           ->where('due_date', '<', now());
                     });
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('tax_type', $type);
    }

    public function scopeDueBefore($query, string $date)
    {
        return $query->where('due_date', '<=', $date);
    }

    public function scopeForPeriod($query, string $start, string $end)
    {
        return $query->whereBetween('period_start', [$start, $end]);
    }

    // ── Computed attributes ────────────────────────────────

    public function getBalanceAttribute(): float
    {
        return (float) $this->amount - (float) $this->paid_amount;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date->isPast() &&
               !in_array($this->status, [self::STATUS_PAID]);
    }

    public function getDaysUntilDueAttribute(): int
    {
        return (int) now()->diffInDays($this->due_date, false);
    }

    public function getIsFullyPaidAttribute(): bool
    {
        return (float) $this->paid_amount >= (float) $this->amount;
    }

    public function getPeriodLabelAttribute(): string
    {
        return $this->period_start->format('M Y')
            . ' — '
            . $this->period_end->format('M Y');
    }

    // ── Actions ───────────────────────────────────────────

    public function recordPayment(
        float $amount,
        string $reference,
        int $paidBy
    ): void {
        $newPaid = (float) $this->paid_amount + $amount;
        $balance = (float) $this->amount;

        $this->update([
            'paid_amount'       => $newPaid,
            'payment_reference' => $reference,
            'paid_by'           => $paidBy,
            'paid_at'           => now()->toDateString(),
            'status'            => $newPaid >= $balance
                ? self::STATUS_PAID
                : self::STATUS_PARTIAL,
        ]);
    }

    // ── Static helpers ────────────────────────────────────

    public static function calculateVAT(
        float $taxableAmount,
        float $rate = 15.0
    ): float {
        return round(($taxableAmount * $rate) / 100, 2);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InsuranceClaim extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'invoice_id',
        'claim_number',
        'insurance_provider',
        'insurance_number',
        'claim_amount',
        'approved_amount',
        'paid_amount',
        'status',
        'submitted_at',
        'approved_at',
        'paid_at',
        'documents',
        'notes',
        'rejection_reason',
        'created_by',
    ];

    protected $casts = [
        'documents'       => 'array',
        'claim_amount'    => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'paid_amount'     => 'decimal:2',
        'submitted_at'    => 'date',
        'approved_at'     => 'date',
        'paid_at'         => 'date',
    ];

    // ── Status constants ───────────────────────────────────
    const STATUS_DRAFT     = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_APPROVED  = 'approved';
    const STATUS_REJECTED  = 'rejected';
    const STATUS_PAID      = 'paid';

    // ── Auto generate claim number ─────────────────────────
    protected static function booted(): void
    {
        static::creating(function ($claim) {
            if (empty($claim->claim_number)) {
                $claim->claim_number = 'CLM-' . date('Y') . '-' . str_pad(
                    static::withTrashed()->count() + 1,
                    4,
                    '0',
                    STR_PAD_LEFT
                );
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

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
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
            self::STATUS_DRAFT,
            self::STATUS_SUBMITTED,
        ]);
    }

    public function scopeNeedsDocs($query)
    {
        return $query->where('status', self::STATUS_SUBMITTED)
                     ->whereNull('documents');
    }

    public function scopeForProvider($query, string $provider)
    {
        return $query->where('insurance_provider', $provider);
    }

    public function scopeSubmittedBetween($query, string $from, string $to)
    {
        return $query->whereBetween('submitted_at', [$from, $to]);
    }

    // ── Computed attributes ────────────────────────────────

    public function getBalanceAttribute(): float
    {
        return (float) $this->claim_amount - (float) $this->paid_amount;
    }

    public function getIsFullyPaidAttribute(): bool
    {
        return (float) $this->paid_amount >= (float) $this->claim_amount;
    }

    public function getHasDocumentsAttribute(): bool
    {
        return !empty($this->documents);
    }

    // ── Actions ───────────────────────────────────────────

    public function submit(): void
    {
        $this->update([
            'status'       => self::STATUS_SUBMITTED,
            'submitted_at' => now()->toDateString(),
        ]);
    }

    public function approve(float $approvedAmount): void
    {
        $this->update([
            'status'          => self::STATUS_APPROVED,
            'approved_amount' => $approvedAmount,
            'approved_at'     => now()->toDateString(),
        ]);
    }

    public function reject(string $reason): void
    {
        $this->update([
            'status'           => self::STATUS_REJECTED,
            'rejection_reason' => $reason,
        ]);
    }

    public function recordPayment(float $amount): void
    {
        $newPaid = (float) $this->paid_amount + $amount;
        $this->update([
            'paid_amount' => $newPaid,
            'status'      => $newPaid >= (float) $this->claim_amount
                ? self::STATUS_PAID
                : self::STATUS_APPROVED,
            'paid_at'     => now()->toDateString(),
        ]);
    }
}
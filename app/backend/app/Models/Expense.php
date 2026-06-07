<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'recorded_by',
        'category',
        'description',
        'amount',
        'vendor',
        'expense_date',
        'reference',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'expense_date' => 'date',
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

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeForPeriod($query, string $from, string $to)
    {
        return $query->whereBetween('expense_date', [$from, $to]);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public static function categories(): array
    {
        return [
            'rent',
            'salaries',
            'supplies',
            'utilities',
            'equipment',
            'marketing',
            'maintenance',
            'other',
        ];
    }
}
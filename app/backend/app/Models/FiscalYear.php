<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class FiscalYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'start_date',
        'end_date',
        'is_active',
        'is_closed',
        'total_revenue',
        'total_expenses',
        'net_income',
        'created_by',
    ];

    protected $casts = [
        'start_date'     => 'date',
        'end_date'       => 'date',
        'is_active'      => 'boolean',
        'is_closed'      => 'boolean',
        'total_revenue'  => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'net_income'     => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function periods()
    {
        return $this->hasMany(AccountingPeriod::class)
                    ->orderBy('period_year')
                    ->orderBy('period_month');
    }

    public function openPeriods()
    {
        return $this->hasMany(AccountingPeriod::class)
                    ->where('status', 'open');
    }

    public function closedPeriods()
    {
        return $this->hasMany(AccountingPeriod::class)
                    ->where('status', 'closed');
    }

    // ── Scopes ────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOpen($query)
    {
        return $query->where('is_closed', false);
    }

    // ── Computed attributes ────────────────────────────────

    public function getDurationAttribute(): string
    {
        return $this->start_date->format('M Y')
            . ' — '
            . $this->end_date->format('M Y');
    }

    public function getProgressPercentAttribute(): int
    {
        if ($this->is_closed) return 100;

        $total   = $this->start_date->diffInDays($this->end_date);
        $elapsed = $this->start_date->diffInDays(now());

        if ($total === 0) return 0;

        return min(100, (int) round(($elapsed / $total) * 100));
    }

    public function getIsCurrentAttribute(): bool
    {
        return now()->between($this->start_date, $this->end_date);
    }

    public function getTotalPeriodsAttribute(): int
    {
        return $this->periods()->count();
    }

    public function getClosedPeriodsCountAttribute(): int
    {
        return $this->closedPeriods()->count();
    }

    // ── Actions ───────────────────────────────────────────

    public function activate(): void
    {
        // Deactivate all other fiscal years for this clinic
        static::forClinic($this->clinic_id)
            ->where('id', '!=', $this->id)
            ->update(['is_active' => false]);

        $this->update(['is_active' => true]);
    }

    public function close(): void
    {
        $this->update([
            'is_closed'  => true,
            'is_active'  => false,
        ]);
    }

    public function recalculateTotals(): void
    {
        $revenue  = $this->periods()->sum('revenue');
        $expenses = $this->periods()->sum('expenses');

        $this->update([
            'total_revenue'  => $revenue,
            'total_expenses' => $expenses,
            'net_income'     => $revenue - $expenses,
        ]);
    }

    // ── Auto generate periods on creation ─────────────────

    public function generatePeriods(int $createdBy): void
    {
        $start  = $this->start_date->copy();
        $end    = $this->end_date->copy();
        $current = $start->copy()->startOfMonth();

        while ($current->lessThanOrEqualTo($end)) {
            AccountingPeriod::firstOrCreate(
                [
                    'fiscal_year_id' => $this->id,
                    'period_month'   => (int) $current->month,
                    'period_year'    => (int) $current->year,
                ],
                [
                    'clinic_id'   => $this->clinic_id,
                    'period_name' => $current->format('F Y'),
                    'status'      => 'open',
                    'revenue'     => 0,
                    'expenses'    => 0,
                    'net'         => 0,
                ]
            );
            $current->addMonth();
        }
    }
}
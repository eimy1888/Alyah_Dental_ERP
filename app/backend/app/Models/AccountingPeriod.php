<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Invoice;
use App\Models\Expense;

class AccountingPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'fiscal_year_id',
        'period_month',
        'period_year',
        'period_name',
        'revenue',
        'expenses',
        'net',
        'revenue_invoices',
        'revenue_insurance',
        'revenue_other',
        'expense_payroll',
        'expense_consumables',
        'expense_utilities',
        'expense_rent',
        'expense_other',
        'status',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'period_month'        => 'integer',
        'period_year'         => 'integer',
        'revenue'             => 'decimal:2',
        'expenses'            => 'decimal:2',
        'net'                 => 'decimal:2',
        'revenue_invoices'    => 'decimal:2',
        'revenue_insurance'   => 'decimal:2',
        'revenue_other'       => 'decimal:2',
        'expense_payroll'     => 'decimal:2',
        'expense_consumables' => 'decimal:2',
        'expense_utilities'   => 'decimal:2',
        'expense_rent'        => 'decimal:2',
        'expense_other'       => 'decimal:2',
        'closed_at'           => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    // ── Scopes ────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeForFiscalYear($query, int $fiscalYearId)
    {
        return $query->where('fiscal_year_id', $fiscalYearId);
    }

    public function scopeForMonth($query, int $month, int $year)
    {
        return $query->where('period_month', $month)
                     ->where('period_year', $year);
    }

    // ── Computed attributes ────────────────────────────────

    public function getIsClosedAttribute(): bool
    {
        return $this->status === 'closed';
    }

    public function getIsCurrentAttribute(): bool
    {
        return $this->period_month === (int) now()->month
            && $this->period_year  === (int) now()->year;
    }

    public function getProfitMarginAttribute(): float
    {
        if ((float) $this->revenue === 0.0) return 0.0;
        return round(((float) $this->net / (float) $this->revenue) * 100, 2);
    }

    public function getStartDateAttribute(): string
    {
        return \Carbon\Carbon::create(
            $this->period_year,
            $this->period_month,
            1
        )->startOfMonth()->toDateString();
    }

    public function getEndDateAttribute(): string
    {
        return \Carbon\Carbon::create(
            $this->period_year,
            $this->period_month,
            1
        )->endOfMonth()->toDateString();
    }

    // ── Actions ───────────────────────────────────────────

    public function recalculate(): void
    {
        $clinicId = $this->clinic_id;
        $start    = $this->start_date;
        $end      = $this->end_date;

        // Revenue from paid/partial invoices
        $revenueInvoices = Invoice::where('clinic_id', $clinicId)
            ->whereIn('status', ['paid', 'partial'])
            ->whereBetween('issued_at', [$start, $end])
            ->sum('paid_amount');

        // Revenue from insurance claims paid
        $revenueInsurance = InsuranceClaim::where('clinic_id', $clinicId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->sum('paid_amount');

        // Expenses by category
        $expensePayroll     = Expense::where('clinic_id', $clinicId)
            ->where('category', 'payroll')
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount');

        $expenseConsumables = Expense::where('clinic_id', $clinicId)
            ->where('category', 'consumables')
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount');

        $expenseUtilities   = Expense::where('clinic_id', $clinicId)
            ->where('category', 'utilities')
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount');

        $expenseRent        = Expense::where('clinic_id', $clinicId)
            ->where('category', 'rent')
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount');

        $expenseOther       = Expense::where('clinic_id', $clinicId)
            ->whereNotIn('category', ['payroll', 'consumables', 'utilities', 'rent'])
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount');

        $totalRevenue  = $revenueInvoices + $revenueInsurance;
        $totalExpenses = $expensePayroll + $expenseConsumables
                       + $expenseUtilities + $expenseRent + $expenseOther;

        $this->update([
            'revenue'             => $totalRevenue,
            'expenses'            => $totalExpenses,
            'net'                 => $totalRevenue - $totalExpenses,
            'revenue_invoices'    => $revenueInvoices,
            'revenue_insurance'   => $revenueInsurance,
            'revenue_other'       => 0,
            'expense_payroll'     => $expensePayroll,
            'expense_consumables' => $expenseConsumables,
            'expense_utilities'   => $expenseUtilities,
            'expense_rent'        => $expenseRent,
            'expense_other'       => $expenseOther,
        ]);

        // Update fiscal year totals
        $this->fiscalYear->recalculateTotals();
    }

    public function close(int $closedBy): bool
    {
        if ($this->status === 'closed') {
            return false;
        }

        // Recalculate before closing
        $this->recalculate();

        $this->update([
            'status'    => 'closed',
            'closed_at' => now(),
            'closed_by' => $closedBy,
        ]);

        // Check if all periods closed — close fiscal year
        $openPeriods = AccountingPeriod::forFiscalYear($this->fiscal_year_id)
            ->open()
            ->count();

        if ($openPeriods === 0) {
            $this->fiscalYear->close();
        }

        return true;
    }
}
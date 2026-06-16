<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    // ── Helper ────────────────────────────────────────────────────────────────
    private function clinicId(): int
    {
        return auth()->user()->clinic_id;
    }

    /**
     * GET /api/v1/clinic/finance/summary
     * High-level KPIs: MTD revenue, expenses, net profit, outstanding.
     * Supports: ?branch_id=, ?month=YYYY-MM
     */
    public function summary(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();

        // Period — default current month
        $month     = $request->get('month', now()->format('Y-m'));
        $startDate = $month . '-01';
        $endDate   = date('Y-m-t', strtotime($startDate));

        $branchId = $request->branch_id;

        // ── Revenue (completed payments in period) ────────────────────────────
        $revenueQuery = Payment::forClinic($clinicId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($branchId) $revenueQuery->where('branch_id', $branchId);

        $revenue = $revenueQuery->sum('amount');

        // ── Expenses (approved in period) ─────────────────────────────────────
        $expenseQuery = Expense::forClinic($clinicId)
            ->approved()
            ->whereBetween('expense_date', [$startDate, $endDate]);

        if ($branchId) $expenseQuery->forBranch($branchId);

        $expenses = $expenseQuery->sum('amount');

        // ── Outstanding receivables ───────────────────────────────────────────
        $outstandingQuery = Invoice::forClinic($clinicId)
            ->whereIn('status', ['sent', 'partial', 'overdue']);

        if ($branchId) $outstandingQuery->where('branch_id', $branchId);

        $outstanding = $outstandingQuery->sum('balance');

        // ── Invoice counts ────────────────────────────────────────────────────
        $invoiceQuery = Invoice::forClinic($clinicId)
            ->whereBetween('issued_at', [$startDate, $endDate]);

        if ($branchId) $invoiceQuery->where('branch_id', $branchId);

        $invoiceCounts = $invoiceQuery
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // ── Payment method breakdown ──────────────────────────────────────────
        $methodBreakdown = Payment::forClinic($clinicId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('method')
            ->get()
            ->map(fn($r) => [
                'method' => $r->method,
                'total'  => (float) $r->total,
                'count'  => $r->count,
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'period'       => $month,
                'revenue'      => (float) $revenue,
                'expenses'     => (float) $expenses,
                'net_profit'   => (float) ($revenue - $expenses),
                'outstanding'  => (float) $outstanding,
                'profit_margin'=> $revenue > 0
                    ? round((($revenue - $expenses) / $revenue) * 100, 1)
                    : 0,
                'invoice_counts'   => $invoiceCounts,
                'payment_methods'  => $methodBreakdown,
            ],
        ]);
    }

    /**
     * GET /api/v1/clinic/finance/revenue-trend
     * Monthly revenue vs expenses for the last N months.
     * Supports: ?months=6 (default 6)
     */
    public function revenueTrend(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();
        $months   = min((int) $request->get('months', 6), 12);
        $branchId = $request->branch_id;

        $trend = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $date      = now()->subMonths($i);
            $monthKey  = $date->format('Y-m');
            $startDate = $date->startOfMonth()->format('Y-m-d');
            $endDate   = $date->endOfMonth()->format('Y-m-d');

            $revenueQ = Payment::forClinic($clinicId)
                ->where('status', 'completed')
                ->whereBetween('paid_at', [
                    $startDate . ' 00:00:00',
                    $endDate   . ' 23:59:59',
                ]);
            if ($branchId) $revenueQ->where('branch_id', $branchId);

            $expenseQ = Expense::forClinic($clinicId)
                ->approved()
                ->whereBetween('expense_date', [$startDate, $endDate]);
            if ($branchId) $expenseQ->forBranch($branchId);

            $trend[] = [
                'month'    => $date->format('M'),
                'month_key'=> $monthKey,
                'revenue'  => (float) $revenueQ->sum('amount'),
                'expenses' => (float) $expenseQ->sum('amount'),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => $trend,
        ]);
    }

    /**
     * GET /api/v1/clinic/finance/branch-breakdown
     * Revenue + expenses per branch for current month.
     */
    public function branchBreakdown(Request $request): JsonResponse
    {
        $clinicId  = $this->clinicId();
        $month     = $request->get('month', now()->format('Y-m'));
        $startDate = $month . '-01';
        $endDate   = date('Y-m-t', strtotime($startDate));

        $branches = Branch::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->get();

        $breakdown = $branches->map(function ($branch) use ($clinicId, $startDate, $endDate) {
            $revenue = Payment::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->where('status', 'completed')
                ->whereBetween('paid_at', [
                    $startDate . ' 00:00:00',
                    $endDate   . ' 23:59:59',
                ])
                ->sum('amount');

            $expenses = Expense::forClinic($clinicId)
                ->forBranch($branch->id)
                ->approved()
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->sum('amount');

            $outstanding = Invoice::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->whereIn('status', ['sent', 'partial', 'overdue'])
                ->sum('balance');

            return [
                'branch_id'   => $branch->id,
                'branch_name' => $branch->name,
                'revenue'     => (float) $revenue,
                'expenses'    => (float) $expenses,
                'net'         => (float) ($revenue - $expenses),
                'outstanding' => (float) $outstanding,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $breakdown,
        ]);
    }

    /**
     * GET /api/v1/clinic/finance/expenses
     * Paginated list of expenses with filters.
     */
    public function expenses(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();

        $query = Expense::forClinic($clinicId)
            ->with(['branch:id,name', 'recordedBy:id,name'])
            ->orderByDesc('expense_date');

        if ($request->filled('branch_id')) {
            $query->forBranch($request->branch_id);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->to);
        }

        $expenses = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $expenses->map(fn($e) => $this->formatExpense($e)),
            'meta'    => [
                'current_page' => $expenses->currentPage(),
                'last_page'    => $expenses->lastPage(),
                'total'        => $expenses->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/clinic/finance/expenses
     * Record a new expense.
     */
    public function storeExpense(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id'    => ['nullable', 'exists:branches,id'],
            'category'     => ['required', 'string', 'max:100'],
            'description'  => ['required', 'string', 'max:500'],
            'amount'       => ['required', 'numeric', 'min:0.01'],
            'vendor'       => ['nullable', 'string', 'max:200'],
            'expense_date' => ['required', 'date'],
            'reference'    => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ]);

        $expense = Expense::create([
            ...$validated,
            'clinic_id'   => $this->clinicId(),
            'recorded_by' => auth()->id(),
            'status'      => 'approved',
        ]);

        \App\Models\AuditLog::record('expense.created', [
            'subject_type'  => 'Expense',
            'subject_id'    => $expense->id,
            'subject_label' => $validated['description'],
            'new_values'    => ['amount' => $validated['amount'], 'category' => $validated['category']],
        ], request());

        return response()->json([
            'success' => true,
            'message' => 'Expense recorded successfully.',
            'data'    => $this->formatExpense($expense->load(['branch', 'recordedBy'])),
        ], 201);
    }

    /**
     * DELETE /api/v1/clinic/finance/expenses/{expense}
     * Delete an expense.
     */
    public function deleteExpense(Expense $expense): JsonResponse
    {
        abort_if($expense->clinic_id !== $this->clinicId(), 403);

        \App\Models\AuditLog::record('expense.deleted', [
            'subject_type'  => 'Expense',
            'subject_id'    => $expense->id,
            'subject_label' => $expense->description,
            'old_values'    => ['amount' => $expense->amount, 'category' => $expense->category],
        ], request());

        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Expense deleted.',
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatExpense(Expense $expense): array
    {
        return [
            'id'           => $expense->id,
            'category'     => $expense->category,
            'description'  => $expense->description,
            'amount'       => (float) $expense->amount,
            'vendor'       => $expense->vendor,
            'expense_date' => $expense->expense_date?->format('Y-m-d'),
            'reference'    => $expense->reference,
            'status'       => $expense->status,
            'notes'        => $expense->notes,
            'branch'       => $expense->branch?->name ?? '—',
            'branch_id'    => $expense->branch_id,
            'recorded_by'  => $expense->recordedBy?->name ?? '—',
            'created_at'   => $expense->created_at->format('d M Y'),
        ];
    }
}
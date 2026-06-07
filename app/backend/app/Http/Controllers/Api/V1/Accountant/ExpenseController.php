<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Expense;
use App\Models\Branch;
use Carbon\Carbon;

class ExpenseController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // List expenses with filters
    // ─────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $query = Expense::forClinic($clinicId)
            ->with('branch');

        // Filter by category
        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Filter by branch
        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $query->where('branch_id', $request->branch_id);
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->whereDate('expense_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('expense_date', '<=', $request->to_date);
        }

        $expenses = $query->orderByDesc('expense_date')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $expenses->map(fn($e) => $this->formatExpense($e)),
            'meta' => [
                'total' => $expenses->total(),
                'current_page' => $expenses->currentPage(),
                'last_page' => $expenses->lastPage(),
                'per_page' => $expenses->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Create expense
    // ─────────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $request->validate([
            'category' => 'required|string|in:consumables,payroll,utilities,rent,marketing,maintenance,software,other',
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string|max:500',
            'expense_date' => 'required|date',
            'supplier' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $expense = Expense::create([
            'clinic_id' => $clinicId,
            'branch_id' => $request->branch_id,
            'category' => $request->category,
            'amount' => $request->amount,
            'description' => $request->description,
            'supplier' => $request->supplier,
            'expense_date' => $request->expense_date,
            'created_by' => $accountant->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expense added successfully.',
            'data' => $this->formatExpense($expense->load('branch')),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Update expense
    // ─────────────────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $expense = Expense::forClinic($clinicId)->findOrFail($id);

        $request->validate([
            'category' => 'sometimes|string|in:consumables,payroll,utilities,rent,marketing,maintenance,software,other',
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'sometimes|string|max:500',
            'expense_date' => 'sometimes|date',
            'supplier' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $expense->update($request->only([
            'category', 'amount', 'description', 'expense_date', 'supplier', 'branch_id'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Expense updated successfully.',
            'data' => $this->formatExpense($expense->fresh('branch')),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Delete expense
    // ─────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $expense = Expense::forClinic($clinicId)->findOrFail($id);
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Expense deleted successfully.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Budget vs Actual for current month
    // ─────────────────────────────────────────────────────────────
    public function budget(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        // Budget targets (mock - in production, these would come from a budget table)
        $budgetTargets = [
            'consumables' => 200000,
            'payroll' => 85000,
            'utilities' => 15000,
            'rent' => 45000,
            'marketing' => 20000,
            'maintenance' => 10000,
            'software' => 10000,
            'other' => 15000,
        ];

        $currentMonthExpenses = Expense::forClinic($clinicId)
            ->whereYear('expense_date', Carbon::now()->year)
            ->whereMonth('expense_date', Carbon::now()->month)
            ->get()
            ->groupBy('category')
            ->map(fn($items) => $items->sum('amount'));

        $budgetVsActual = [];
        foreach ($budgetTargets as $category => $budget) {
            $actual = $currentMonthExpenses[$category] ?? 0;
            $variance = $budget - $actual;
            $percentUsed = $budget > 0 ? round(($actual / $budget) * 100, 1) : 0;
            
            $budgetVsActual[] = [
                'category' => ucfirst($category),
                'category_key' => $category,
                'budget' => $budget,
                'actual' => round($actual, 2),
                'variance' => round($variance, 2),
                'percent_used' => $percentUsed,
                'status' => $percentUsed >= 100 ? 'over_budget' : ($percentUsed >= 80 ? 'warning' : 'good'),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $budgetVsActual,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Get expense categories for filter
    // ─────────────────────────────────────────────────────────────
    public function categories(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                ['value' => 'consumables', 'label' => 'Consumables'],
                ['value' => 'payroll', 'label' => 'Payroll'],
                ['value' => 'utilities', 'label' => 'Utilities'],
                ['value' => 'rent', 'label' => 'Rent'],
                ['value' => 'marketing', 'label' => 'Marketing'],
                ['value' => 'maintenance', 'label' => 'Maintenance'],
                ['value' => 'software', 'label' => 'Software'],
                ['value' => 'other', 'label' => 'Other'],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Format expense helper
    // ─────────────────────────────────────────────────────────────
    private function formatExpense(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'category' => $expense->category,
            'category_label' => ucfirst($expense->category),
            'amount' => $expense->amount,
            'description' => $expense->description,
            'supplier' => $expense->supplier,
            'expense_date' => $expense->expense_date->toDateString(),
            'branch_id' => $expense->branch_id,
            'branch_name' => $expense->branch?->name ?? 'All Branches',
            'created_by' => $expense->created_by,
            'created_at' => $expense->created_at->toDateTimeString(),
        ];
    }
}
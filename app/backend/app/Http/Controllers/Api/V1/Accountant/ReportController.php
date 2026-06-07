<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Report;
use App\Models\FiscalYear;
use App\Models\AccountingPeriod;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Expense;
use Carbon\Carbon;

class ReportController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // REPORTS STUDIO
    // ─────────────────────────────────────────────────────────────

    // Get available report types
    public function getReportTypes(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                ['type' => 'revenue_performance', 'label' => 'Revenue Performance', 'description' => 'Monthly/quarterly revenue breakdown by branch'],
                ['type' => 'expense_analysis', 'label' => 'Expense Analysis', 'description' => 'Expense breakdown by category and branch'],
                ['type' => 'dentist_productivity', 'label' => 'Dentist Productivity', 'description' => 'Revenue generated per dentist, appointment volume'],
                ['type' => 'insurance_claims', 'label' => 'Insurance Claims', 'description' => 'Claims submitted, approved, paid status'],
                ['type' => 'accounts_receivable', 'label' => 'Accounts Receivable', 'description' => 'Aging report of outstanding invoices'],
                ['type' => 'tax_summary', 'label' => 'Tax Summary', 'description' => 'VAT and other tax liabilities by period'],
                ['type' => 'expiry_alert', 'label' => 'Expiry Alert', 'description' => 'Upcoming tax deadlines and insurance renewals'],
            ],
        ]);
    }

    // Generate report
    public function generateReport(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $request->validate([
            'type' => 'required|string',
            'parameters' => 'nullable|array',
        ]);

        // For MVP: Create a report record and return success
        // In production: Queue job to generate actual PDF/Excel

        $report = Report::create([
            'clinic_id' => $clinicId,
            'type' => $request->type,
            'parameters' => $request->parameters ?? [],
            'file_path' => 'reports/' . $request->type . '_' . time() . '.pdf',
            'generated_by' => $accountant->id,
            'generated_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Report generation started. You will be notified when ready.',
            'data' => [
                'id' => $report->id,
                'type' => $report->type,
                'generated_at' => $report->generated_at->toDateTimeString(),
            ],
        ]);
    }

    // Get previously generated reports
    public function getGeneratedReports(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $reports = Report::forClinic($clinicId)
            ->orderByDesc('generated_at')
            ->paginate($request->get('per_page', 10));

        return response()->json([
            'success' => true,
            'data' => $reports->map(fn($r) => [
                'id' => $r->id,
                'type' => $r->type,
                'parameters' => $r->parameters,
                'file_url' => $r->file_url,
                'generated_at' => $r->formatted_generated_at,
            ]),
            'meta' => [
                'total' => $reports->total(),
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
            ],
        ]);
    }

    // Download report (stub)
    public function downloadReport(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $report = Report::forClinic($clinicId)->findOrFail($id);

        // In production: return file download
        return response()->json([
            'success' => true,
            'message' => 'Download will start shortly.',
            'data' => ['file_url' => $report->file_url],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // FISCAL YEAR
    // ─────────────────────────────────────────────────────────────

    // Get all fiscal years
    public function getFiscalYears(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $fiscalYears = FiscalYear::forClinic($clinicId)
            ->orderByDesc('start_date')
            ->get();

        $currentYear = FiscalYear::forClinic($clinicId)
            ->where('is_closed', false)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'fiscal_years' => $fiscalYears->map(fn($fy) => [
                    'id' => $fy->id,
                    'name' => $fy->name,
                    'start_date' => $fy->start_date->toDateString(),
                    'end_date' => $fy->end_date->toDateString(),
                    'is_closed' => $fy->is_closed,
                ]),
                'current_year' => $currentYear ? [
                    'id' => $currentYear->id,
                    'name' => $currentYear->name,
                ] : null,
            ],
        ]);
    }

    // Get periods for a fiscal year with revenue/expense/net
    public function getPeriods(Request $request, int $fiscalYearId): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $fiscalYear = FiscalYear::forClinic($clinicId)->findOrFail($fiscalYearId);

        $periods = AccountingPeriod::where('fiscal_year_id', $fiscalYear->id)
            ->orderBy('period_year')
            ->orderByRaw("FIELD(period_month, 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June')")
            ->get();

        // If periods don't have revenue/expense from actual data, calculate them
        foreach ($periods as $period) {
            if ($period->revenue == 0 && $period->expenses == 0) {
                // Calculate actual revenue for this period
                $startDate = Carbon::create($period->period_year, Carbon::parse($period->period_month)->month, 1);
                $endDate = $startDate->copy()->endOfMonth();

                $revenue = Payment::forClinic($clinicId)
                    ->whereBetween('paid_at', [$startDate, $endDate])
                    ->where('status', 'completed')
                    ->sum('amount');

                $expenses = Expense::forClinic($clinicId)
                    ->whereBetween('expense_date', [$startDate, $endDate])
                    ->sum('amount');

                $period->revenue = $revenue;
                $period->expenses = $expenses;
                $period->net = $revenue - $expenses;
                $period->save();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'fiscal_year' => [
                    'id' => $fiscalYear->id,
                    'name' => $fiscalYear->name,
                    'start_date' => $fiscalYear->start_date->toDateString(),
                    'end_date' => $fiscalYear->end_date->toDateString(),
                    'is_closed' => $fiscalYear->is_closed,
                ],
                'periods' => $periods->map(fn($p) => [
                    'id' => $p->id,
                    'month' => $p->period_month,
                    'year' => $p->period_year,
                    'revenue' => round($p->revenue, 2),
                    'expenses' => round($p->expenses, 2),
                    'net' => round($p->net, 2),
                    'status' => $p->status,
                ]),
                'totals' => [
                    'total_revenue' => round($periods->sum('revenue'), 2),
                    'total_expenses' => round($periods->sum('expenses'), 2),
                    'total_net' => round($periods->sum('net'), 2),
                ],
            ],
        ]);
    }

    // Close accounting period
    public function closePeriod(Request $request, int $periodId): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $period = AccountingPeriod::whereHas('fiscalYear', function ($q) use ($clinicId) {
            $q->forClinic($clinicId);
        })->findOrFail($periodId);

        if ($period->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Period is already closed.',
            ], 422);
        }

        $period->update(['status' => 'closed']);

        return response()->json([
            'success' => true,
            'message' => 'Accounting period closed successfully.',
            'data' => [
                'id' => $period->id,
                'status' => $period->status,
            ],
        ]);
    }

    // Create new fiscal year
    public function createFiscalYear(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        // Close current fiscal year
        FiscalYear::forClinic($clinicId)->where('is_closed', false)->update(['is_closed' => true]);

        // Create new fiscal year
        $fiscalYear = FiscalYear::create([
            'clinic_id' => $clinicId,
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_closed' => false,
        ]);

        // Create accounting periods for new fiscal year
        $start = Carbon::parse($request->start_date);
        $end = Carbon::parse($request->end_date);
        
        $current = $start->copy();
        while ($current <= $end) {
            AccountingPeriod::create([
                'fiscal_year_id' => $fiscalYear->id,
                'period_month' => $current->format('F'),
                'period_year' => $current->year,
                'revenue' => 0,
                'expenses' => 0,
                'net' => 0,
                'status' => 'open',
            ]);
            $current->addMonth();
        }

        return response()->json([
            'success' => true,
            'message' => 'Fiscal year created successfully.',
            'data' => [
                'id' => $fiscalYear->id,
                'name' => $fiscalYear->name,
                'start_date' => $fiscalYear->start_date->toDateString(),
                'end_date' => $fiscalYear->end_date->toDateString(),
            ],
        ]);
    }
}
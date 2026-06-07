<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\InsuranceClaim;
use App\Models\Expense;
use App\Models\Tax;
use App\Models\User;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;
        $today      = Carbon::today();
        $yesterday  = Carbon::yesterday();

        // ── 1. Collected today ────────────────────────────
        $collectedToday = Payment::where('clinic_id', $clinicId)
            ->where('status', 'completed')
            ->whereDate('paid_at', $today)
            ->sum('amount');

        $collectedYesterday = Payment::where('clinic_id', $clinicId)
            ->where('status', 'completed')
            ->whereDate('paid_at', $yesterday)
            ->sum('amount');

        $percentChange = $collectedYesterday > 0
            ? round((($collectedToday - $collectedYesterday) / $collectedYesterday) * 100, 1)
            : 0;

        // ── 2. Outstanding AR ─────────────────────────────
        $outstandingAR = Invoice::where('clinic_id', $clinicId)
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->sum('balance');                              // ← was balance_due

        $overdueCount = Invoice::where('clinic_id', $clinicId)
            ->where('status', 'overdue')
            ->count();

        // ── 3. Payroll run ────────────────────────────────
        $staffCount = User::where('clinic_id', $clinicId)
            ->whereNotIn('role', ['platform_admin', 'clinic_admin'])
            ->count();

        $dueDays = $today->diffInDays($today->copy()->endOfMonth());

        // ── 4. Claims pending ─────────────────────────────
        $claimsPending = InsuranceClaim::where('clinic_id', $clinicId)
            ->whereIn('status', ['draft', 'submitted'])
            ->count();

        $needDocsCount = InsuranceClaim::where('clinic_id', $clinicId)
            ->where('status', 'submitted')
            ->whereNull('documents')
            ->count();

        // ── 5. Revenue trend (last 6 months) ─────────────
        $revenueTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month     = $today->copy()->subMonths($i);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate   = $month->copy()->endOfMonth()->toDateString();

            $revenue = Payment::where('clinic_id', $clinicId)
                ->where('status', 'completed')
                ->whereBetween('paid_at', [$startDate, $endDate])
                ->sum('amount');

            $revenueTrend[] = [
                'month'   => $month->format('M Y'),
                'revenue' => (float) $revenue,
            ];
        }

        // ── 6. Expense trend (last 6 months) ─────────────
        $expenseTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month     = $today->copy()->subMonths($i);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate   = $month->copy()->endOfMonth()->toDateString();

            $expenses = Expense::where('clinic_id', $clinicId)
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->sum('amount');

            $expenseTrend[] = [
                'month'    => $month->format('M Y'),
                'expenses' => (float) $expenses,
            ];
        }

        // ── 7. Invoice ledger (recent 8) ──────────────────
        $invoiceLedger = Invoice::where('clinic_id', $clinicId)
            ->whereIn('status', ['sent', 'partial', 'overdue', 'paid'])
            ->with('patient')
            ->orderByDesc('issued_at')
            ->limit(8)
            ->get()
            ->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'patient_name'   => $inv->patient
                    ? "{$inv->patient->first_name} {$inv->patient->last_name}"
                    : '—',
                'total'          => (float) $inv->total,
                'balance'        => (float) $inv->balance,   // ← was balance_due
                'status'         => $inv->status,
                'due_date'       => $inv->due_date
                    ? Carbon::parse($inv->due_date)->toDateString()
                    : '—',
            ]);

        // ── 8. Recent payments (last 5) ───────────────────
        $recentPayments = Payment::where('clinic_id', $clinicId)
            ->where('status', 'completed')
            ->with(['patient', 'invoice'])
            ->orderByDesc('paid_at')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id'             => $p->id,
                'patient_name'   => $p->patient
                    ? "{$p->patient->first_name} {$p->patient->last_name}"
                    : '—',
                'amount'         => (float) $p->amount,
                'method'         => $p->payment_method ?? '—',
                'date'           => $p->paid_at
                    ? Carbon::parse($p->paid_at)->toDateString()
                    : '—',
                'invoice_number' => $p->invoice?->invoice_number ?? '—',
            ]);

        // ── 9. Recent insurance claims (last 5) ───────────
        $recentClaims = InsuranceClaim::where('clinic_id', $clinicId)
            ->with('patient')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id'           => $c->id,
                'patient_name' => $c->patient
                    ? "{$c->patient->first_name} {$c->patient->last_name}"
                    : '—',
                'provider'     => $c->insurance_provider,
                'amount'       => (float) $c->claim_amount,
                'status'       => $c->status,
            ]);

        // ── 10. Tax center ────────────────────────────────
        $vatPayable = Tax::where('clinic_id', $clinicId)
            ->where('tax_type', 'VAT')
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->sum('amount');

        $upcomingTaxes = Tax::where('clinic_id', $clinicId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->orderBy('due_date')
            ->limit(4)
            ->get()
            ->map(fn($t) => [
                'id'       => $t->id,
                'name'     => $t->name,
                'amount'   => (float) $t->amount,
                'due_date' => $t->due_date->toDateString(),
                'status'   => $t->status,
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'collected_today' => [
                    'amount'         => (float) $collectedToday,
                    'percent_change' => $percentChange,
                ],
                'outstanding_ar' => [
                    'amount'                 => (float) $outstandingAR,
                    'overdue_accounts_count' => $overdueCount,
                ],
                'payroll_run' => [
                    'staff_count' => $staffCount,
                    'due_days'    => $dueDays,
                ],
                'claims_pending' => [
                    'count'           => $claimsPending,
                    'need_docs_count' => $needDocsCount,
                ],
                'revenue_trend'           => $revenueTrend,
                'expense_trend'           => $expenseTrend,
                'invoice_ledger'          => $invoiceLedger,
                'recent_payments'         => $recentPayments,
                'insurance_claims_recent' => $recentClaims,
                'tax_center' => [
                    'vat_payable'    => (float) $vatPayable,
                    'upcoming_taxes' => $upcomingTaxes,
                ],
            ],
        ]);
    }
}
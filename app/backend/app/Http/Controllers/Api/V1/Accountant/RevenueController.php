<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;

class RevenueController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // Get revenue data (ledger, payer mix, chart)
    // ─────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId = $accountant->clinic_id;

        // Get branch filter
        $branchId = $request->get('branch_id');
        $period = $request->get('period', 'weekly'); // daily, weekly, monthly

        // ─────────────────────────────────────────────────────────────
        // 1. Revenue Ledger (branch-wise)
        // ─────────────────────────────────────────────────────────────
        $branchesQuery = \App\Models\Branch::where('clinic_id', $clinicId);
        
        if ($branchId) {
            $branchesQuery->where('id', $branchId);
        }
        
        $branches = $branchesQuery->get();

        $revenueLedger = [];
        foreach ($branches as $branch) {
            // Collected this month
            $collected = Payment::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->whereYear('paid_at', Carbon::now()->year)
                ->whereMonth('paid_at', Carbon::now()->month)
                ->where('status', 'completed')
                ->sum('amount');

            // Pending (outstanding invoices — excludes DRAFT)
            $pending = Invoice::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
                ->whereIn('status', ['sent', 'partial'])
                ->sum('balance');

            // Claims (insurance claims submitted)
            $claims = \App\Models\InsuranceClaim::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->where('status', 'submitted')
                ->sum('claim_amount');

            // Growth (compare to previous month)
            $previousMonthCollected = Payment::forClinic($clinicId)
                ->where('branch_id', $branch->id)
                ->whereYear('paid_at', Carbon::now()->subMonth()->year)
                ->whereMonth('paid_at', Carbon::now()->subMonth()->month)
                ->where('status', 'completed')
                ->sum('amount');

            $growth = $previousMonthCollected > 0 
                ? round((($collected - $previousMonthCollected) / $previousMonthCollected) * 100, 1)
                : ($collected > 0 ? 100 : 0);

            $revenueLedger[] = [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'collected' => round($collected, 2),
                'pending' => round($pending, 2),
                'claims' => round($claims, 2),
                'growth' => $growth,
            ];
        }

        // ─────────────────────────────────────────────────────────────
        // 2. Payer Mix (percentages)
        // ─────────────────────────────────────────────────────────────
        $paymentsThisMonth = Payment::forClinic($clinicId)
            ->whereYear('paid_at', Carbon::now()->year)
            ->whereMonth('paid_at', Carbon::now()->month)
            ->where('status', 'completed')
            ->get();

        $totalRevenue = $paymentsThisMonth->sum('amount');

        $payerMix = [
            'private' => 0,
            'insurance' => 0,
            'telebirr_chapa' => 0,
            'bank_transfer' => 0,
            'cash' => 0,
        ];

        foreach ($paymentsThisMonth as $payment) {
            if ($payment->payment_method === 'cash') {
                $payerMix['cash'] += $payment->amount;
            } elseif (in_array($payment->payment_method, ['telebirr', 'chapa'])) {
                $payerMix['telebirr_chapa'] += $payment->amount;
            } elseif ($payment->payment_method === 'bank_transfer') {
                $payerMix['bank_transfer'] += $payment->amount;
            } elseif ($payment->payment_method === 'insurance') {
                $payerMix['insurance'] += $payment->amount;
            } else {
                $payerMix['private'] += $payment->amount;
            }
        }

        // Convert to percentages
        if ($totalRevenue > 0) {
            foreach ($payerMix as $key => $value) {
                $payerMix[$key] = round(($value / $totalRevenue) * 100, 1);
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 3. Revenue Chart Data (based on period)
        // ─────────────────────────────────────────────────────────────
        $revenueChart = [];

        switch ($period) {
            case 'daily':
                // Last 30 days
                for ($i = 29; $i >= 0; $i--) {
                    $date = Carbon::today()->subDays($i);
                    $revenue = Payment::forClinic($clinicId)
                        ->whereDate('paid_at', $date)
                        ->where('status', 'completed')
                        ->sum('amount');
                    
                    $revenueChart[] = [
                        'label' => $date->format('M d'),
                        'revenue' => round($revenue, 2),
                    ];
                }
                break;
            
            case 'monthly':
                // Last 12 months
                for ($i = 11; $i >= 0; $i--) {
                    $date = Carbon::now()->subMonths($i);
                    $revenue = Payment::forClinic($clinicId)
                        ->whereYear('paid_at', $date->year)
                        ->whereMonth('paid_at', $date->month)
                        ->where('status', 'completed')
                        ->sum('amount');
                    
                    $revenueChart[] = [
                        'label' => $date->format('M Y'),
                        'revenue' => round($revenue, 2),
                    ];
                }
                break;
            
            case 'weekly':
            default:
                // Last 12 weeks
                for ($i = 11; $i >= 0; $i--) {
                    $startDate = Carbon::now()->subWeeks($i)->startOfWeek();
                    $endDate = Carbon::now()->subWeeks($i)->endOfWeek();
                    $weekNumber = Carbon::now()->subWeeks($i)->weekOfYear;
                    
                    $revenue = Payment::forClinic($clinicId)
                        ->whereBetween('paid_at', [$startDate, $endDate])
                        ->where('status', 'completed')
                        ->sum('amount');
                    
                    $revenueChart[] = [
                        'label' => "Week {$weekNumber}",
                        'revenue' => round($revenue, 2),
                    ];
                }
                break;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'revenue_ledger' => $revenueLedger,
                'payer_mix' => $payerMix,
                'revenue_chart' => $revenueChart,
                'total_revenue' => round($totalRevenue, 2),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Export revenue data
    // ─────────────────────────────────────────────────────────────
    public function export(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;
        $branchId   = $request->get('branch_id');
        $period     = $request->get('period', 'monthly');
        $year       = (int) $request->get('year', now()->year);
        $month      = (int) $request->get('month', now()->month);

        // Collect revenue data for export
        $query = Payment::forClinic($clinicId)
            ->where('status', 'completed')
            ->with(['patient', 'invoice']);

        if ($branchId) $query->where('branch_id', $branchId);

        if ($period === 'monthly') {
            $query->whereYear('paid_at', $year)->whereMonth('paid_at', $month);
        } else {
            $query->whereYear('paid_at', $year);
        }

        $payments = $query->orderByDesc('paid_at')->get();

        $rows   = [];
        $rows[] = ['Date', 'Patient', 'Method', 'Reference', 'Invoice #', 'Amount (ETB)'];

        foreach ($payments as $p) {
            $rows[] = [
                $p->paid_at?->format('d M Y'),
                $p->patient?->full_name ?? '—',
                ucfirst($p->method ?? '—'),
                $p->reference ?? '—',
                $p->invoice?->invoice_number ?? '—',
                number_format((float) $p->amount, 2),
            ];
        }

        $rows[] = ['', '', '', '', 'TOTAL', number_format($payments->sum('amount'), 2)];

        return response()->json([
            'success' => true,
            'message' => 'Revenue export ready.',
            'data'    => [
                'headers'       => $rows[0],
                'rows'          => array_slice($rows, 1),
                'total_records' => $payments->count(),
                'total_amount'  => (float) $payments->sum('amount'),
                'period'        => $period === 'monthly' ? now()->setYear($year)->setMonth($month)->format('F Y') : $year,
            ],
        ]);
    }
}
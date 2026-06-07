<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * GET /api/v1/platform/analytics
     * Returns real tenant growth, MRR trend, and plan mix
     * for the Platform Admin Dashboard charts.
     */
    public function index(): JsonResponse
    {
        // ── Tenant growth — last 7 months ─────────────────────────────────────
        $tenantGrowth = [];
        for ($i = 6; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $count = Clinic::where('status', 'active')
                ->whereYear('created_at',  $date->year)
                ->whereMonth('created_at', $date->month)
                ->count();

            // Cumulative — count all active clinics up to end of that month
            $cumulative = Clinic::where('status', 'active')
                ->where('created_at', '<=', $date->endOfMonth())
                ->count();

            $tenantGrowth[] = [
                'month'      => $date->format('M'),
                'month_key'  => $date->format('Y-m'),
                'new_clinics'=> $count,
                'total'      => $cumulative,
            ];
        }

        // ── MRR trend — last 7 months ─────────────────────────────────────────
        $mrrTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date       = now()->subMonths($i);
            $monthStart = $date->copy()->startOfMonth()->format('Y-m-d H:i:s');
            $monthEnd   = $date->copy()->endOfMonth()->format('Y-m-d H:i:s');

            // Sum of monthly subscription amounts active during this month
            $monthlyMRR = Subscription::where('status', 'active')
                ->where('billing_cycle', 'monthly')
                ->where('starts_at', '<=', $monthEnd)
                ->where(function ($q) use ($monthStart) {
                    $q->whereNull('ends_at')
                      ->orWhere('ends_at', '>=', $monthStart);
                })
                ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
                ->sum('plans.monthly_price');

            // Annual subs divided by 12 for MRR contribution
            $annualMRR = Subscription::where('status', 'active')
                ->where('billing_cycle', 'annual')
                ->where('starts_at', '<=', $monthEnd)
                ->where(function ($q) use ($monthStart) {
                    $q->whereNull('ends_at')
                      ->orWhere('ends_at', '>=', $monthStart);
                })
                ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
                ->sum('plans.annual_price');

            $mrrTrend[] = [
                'month'     => $date->format('M'),
                'month_key' => $date->format('Y-m'),
                'mrr'       => round(($monthlyMRR + ($annualMRR / 12)) / 1000, 1),
                'raw'       => (float) ($monthlyMRR + ($annualMRR / 12)),
            ];
        }

        // ── Plan mix — current active subscriptions ───────────────────────────
        $plans    = Plan::where('is_active', true)->get();
        $planMix  = $plans->map(function ($plan) {
            $count = Subscription::where('plan_id', $plan->id)
                ->where('status', 'active')
                ->count();
            return [
                'plan_id'   => $plan->id,
                'name'      => $plan->name,
                'slug'      => $plan->slug,
                'count'     => $count,
                'monthly_price' => (float) $plan->monthly_price,
                'annual_price'  => (float) $plan->annual_price,
            ];
        });

        // ── Top-level KPIs ────────────────────────────────────────────────────
        $totalActive  = Clinic::where('status', 'active')->count();
        $totalPending = Clinic::where('status', 'pending_platform_approval')->count();

        // Current real MRR
        $currentMRR = Subscription::where('status', 'active')
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->selectRaw('
                SUM(CASE WHEN billing_cycle = "monthly" THEN plans.monthly_price
                         WHEN billing_cycle = "annual"  THEN plans.annual_price / 12
                         ELSE 0 END) as mrr
            ')
            ->value('mrr');

        // Previous month MRR for growth %
        $prevMonthStart = now()->subMonth()->startOfMonth()->format('Y-m-d H:i:s');
        $prevMonthEnd   = now()->subMonth()->endOfMonth()->format('Y-m-d H:i:s');

        $prevMRR = Subscription::where('status', 'active')
            ->where('starts_at', '<=', $prevMonthEnd)
            ->where(function ($q) use ($prevMonthStart) {
                $q->whereNull('ends_at')
                  ->orWhere('ends_at', '>=', $prevMonthStart);
            })
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->selectRaw('
                SUM(CASE WHEN billing_cycle = "monthly" THEN plans.monthly_price
                         WHEN billing_cycle = "annual"  THEN plans.annual_price / 12
                         ELSE 0 END) as mrr
            ')
            ->value('mrr');

        $mrrGrowthPct = $prevMRR > 0
            ? round((($currentMRR - $prevMRR) / $prevMRR) * 100, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'kpis' => [
                    'total_active_clinics'  => $totalActive,
                    'pending_approvals'     => $totalPending,
                    'current_mrr'           => round((float) $currentMRR, 2),
                    'current_mrr_formatted' => '$' . number_format($currentMRR / 1000, 1) . 'K',
                    'mrr_growth_pct'        => $mrrGrowthPct,
                ],
                'tenant_growth' => $tenantGrowth,
                'mrr_trend'     => $mrrTrend,
                'plan_mix'      => $planMix,
            ],
        ]);
    }
}
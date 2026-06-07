<?php

// app/Http/Controllers/Manager/ManagerFinanceController.php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ManagerFinanceController extends Controller
{
    /**
     * GET /api/v1/manager/finance/weekly-revenue
     * Returns the last 7 days of revenue grouped by date.
     * Response: { labels: ["Mon 13 Jan", ...], data: [1200, 4500, ...] }
     */
    public function weeklyRevenue(): JsonResponse
    {
        // Build a date range: 6 days ago → today
        $days = collect(range(6, 0))->map(
            fn ($daysAgo) => Carbon::today()->subDays($daysAgo)
        );

        // Sum payments per day (tenant-scoped via global scope on Payment model)
        $revenues = Payment::select(
                DB::raw('DATE(payment_date) as day'),
                DB::raw('SUM(amount) as total')
            )
            ->whereBetween('payment_date', [
                Carbon::today()->subDays(6)->startOfDay(),
                Carbon::today()->endOfDay(),
            ])
            ->groupBy('day')
            ->pluck('total', 'day'); // keyed by "YYYY-MM-DD"

        // Build labels and data arrays — fill 0 for days with no payments
        $labels = $days->map(fn ($d) => $d->format('D j M'))->values();
        $data   = $days->map(fn ($d) => (float) ($revenues[$d->toDateString()] ?? 0))->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'labels' => $labels,
                'data'   => $data,
            ],
        ]);
    }
}
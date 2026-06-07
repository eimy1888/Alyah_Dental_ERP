<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerReportsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;
        $range    = $request->get('range', '30d');

        // ── Date range ────────────────────────────────────────
        [$startDate, $days] = match ($range) {
            '7d' => [now()->subDays(7),   7],
            '3m' => [now()->subMonths(3), 90],
            default => [now()->subDays(30), 30],
        };

        // ── Base query helpers ────────────────────────────────
        $apptBase = Appointment::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('appointment_time', '>=', $startDate);

        $patientBase = Patient::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('created_at', '>=', $startDate);

        // ── Summary KPIs ──────────────────────────────────────
        $totalAppointments    = (clone $apptBase)->count();
        $completedAppointments= (clone $apptBase)->where('status', 'completed')->count();
        $completionRate       = $totalAppointments > 0
            ? round(($completedAppointments / $totalAppointments) * 100)
            : 0;

        $totalPatients = Patient::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->count();

        $newPatients = (clone $patientBase)->count();

        $lowStockCount = InventoryItem::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereColumn('current_quantity', '<=', 'reorder_threshold')
            ->count();

        // ── Appointments chart — daily buckets ────────────────
        $appointmentsChart = [];
        $interval = $days <= 7 ? 1 : ($days <= 30 ? 1 : 7);

        for ($i = $days; $i >= 0; $i -= $interval) {
            $date  = now()->subDays($i);
            $end   = $interval > 1 ? now()->subDays(max($i - $interval + 1, 0)) : $date;

            $count = (clone $apptBase)
                ->whereDate('appointment_time', '>=', $date->toDateString())
                ->whereDate('appointment_time', '<=', $end->toDateString())
                ->count();

            $appointmentsChart[] = [
                'label' => $interval > 1
                    ? $date->format('M d')
                    : $date->format($days <= 7 ? 'D' : 'M d'),
                'count' => $count,
            ];
        }

        // ── Status breakdown chart ────────────────────────────
        $statusChart = (clone $apptBase)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->map(fn($r) => [
                'status' => ucfirst(str_replace('_', ' ', $r->status)),
                'count'  => $r->count,
            ])
            ->values();

        // ── Appointment types chart ───────────────────────────
        $typeChart = (clone $apptBase)
            ->whereNotNull('type')
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn($r) => [
                'type'  => ucfirst(str_replace('_', ' ', $r->type)),
                'count' => $r->count,
            ])
            ->values();

        // ── New patients chart — daily/weekly buckets ─────────
        $patientsChart = [];
        for ($i = $days; $i >= 0; $i -= $interval) {
            $date = now()->subDays($i);
            $end  = $interval > 1 ? now()->subDays(max($i - $interval + 1, 0)) : $date;

            $count = Patient::where('clinic_id', $clinicId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->whereDate('created_at', '>=', $date->toDateString())
                ->whereDate('created_at', '<=', $end->toDateString())
                ->count();

            $patientsChart[] = [
                'label' => $interval > 1
                    ? $date->format('M d')
                    : $date->format($days <= 7 ? 'D' : 'M d'),
                'count' => $count,
            ];
        }

        // ── Inventory summary ─────────────────────────────────
        $inventorySummary = InventoryItem::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->orderByRaw('current_quantity / reorder_threshold ASC')
            ->limit(10)
            ->get()
            ->map(fn($item) => [
                'id'                => $item->id,
                'name'              => $item->name,
                'sku'               => $item->sku,
                'current_quantity'  => $item->current_quantity,
                'reorder_threshold' => $item->reorder_threshold,
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'summary' => [
                    'total_appointments'     => $totalAppointments,
                    'completed_appointments' => $completedAppointments,
                    'completion_rate'        => $completionRate,
                    'total_patients'         => $totalPatients,
                    'new_patients'           => $newPatients,
                    'low_stock_count'        => $lowStockCount,
                ],
                'appointments_chart' => $appointmentsChart,
                'status_chart'       => $statusChart,
                'type_chart'         => $typeChart,
                'patients_chart'     => $patientsChart,
                'inventory_summary'  => $inventorySummary,
            ],
        ]);
    }
}
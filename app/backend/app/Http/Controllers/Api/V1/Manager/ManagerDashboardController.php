<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\InventoryItem;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id; // may be null

        // ── Today's appointments ──────────────────────────────
        $apptQuery = Appointment::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId));

        $todayAppointments = (clone $apptQuery)
            ->whereDate('appointment_time', today())
            ->count();

        $completedToday = (clone $apptQuery)
            ->whereDate('appointment_time', today())
            ->where('status', 'completed')
            ->count();

        $pendingToday = (clone $apptQuery)
            ->whereDate('appointment_time', today())
            ->whereIn('status', ['pending', 'confirmed', 'checked_in', 'in_progress'])
            ->count();

        // ── Patients ──────────────────────────────────────────
        $patientQuery = Patient::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId));

        $totalPatients = (clone $patientQuery)->count();

        $newPatientsThisMonth = (clone $patientQuery)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at',  now()->year)
            ->count();

        // ── Inventory — no softDeletes, no deleted_at ─────────
        $inventoryQuery = InventoryItem::where('clinic_id', $clinicId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereColumn('current_quantity', '<=', 'reorder_threshold');

        $lowStockCount = (clone $inventoryQuery)->count();

        // ── Today's schedule ──────────────────────────────────
        $todaySchedule = (clone $apptQuery)
            ->whereDate('appointment_time', today())
            ->whereIn('status', [
                'pending', 'confirmed', 'checked_in', 'in_progress', 'completed',
            ])
            ->with([
                'patient:id,first_name,last_name',
                'dentist:id,name',
            ])
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'time'         => $a->appointment_time->format('H:i'),
                'patient_name' => $a->patient
                    ? trim($a->patient->first_name . ' ' . $a->patient->last_name)
                    : 'Unknown',
                'dentist_name' => $a->dentist?->name ?? '—',
                'type'         => $a->type,
                'status'       => $a->status,
                'duration'     => $a->duration_minutes,
            ]);

        // ── Weekly chart data ─────────────────────────────────
        $weeklyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date  = now()->subDays($i);
            $count = (clone $apptQuery)
                ->whereDate('appointment_time', $date->toDateString())
                ->count();
            $weeklyData[] = [
                'day'   => $date->format('D'),
                'date'  => $date->format('M d'),
                'count' => $count,
            ];
        }

        // ── Stock alerts ──────────────────────────────────────
        $stockAlerts = (clone $inventoryQuery)
            ->orderBy('current_quantity')
            ->limit(5)
            ->get()
            ->map(fn($item) => [
                'id'                => $item->id,
                'name'              => $item->name,
                'sku'               => $item->sku,
                'current_quantity'  => $item->current_quantity,
                'reorder_threshold' => $item->reorder_threshold,
            ]);

        // ── Status breakdown ──────────────────────────────────
        $statusBreakdown = (clone $apptQuery)
            ->whereDate('appointment_time', today())
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // ── Recent patients ───────────────────────────────────
        $recentPatients = (clone $patientQuery)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id'     => $p->id,
                'name'   => trim($p->first_name . ' ' . $p->last_name),
                'phone'  => $p->phone,
                'joined' => $p->created_at->format('d M Y'),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'today_appointments'  => $todayAppointments,
                'completed_today'     => $completedToday,
                'pending_today'       => $pendingToday,
                'total_patients'      => $totalPatients,
                'new_patients_month'  => $newPatientsThisMonth,
                'low_stock_count'     => $lowStockCount,
                'today_schedule'      => $todaySchedule,
                'weekly_appointments' => $weeklyData,
                'stock_alerts'        => $stockAlerts,
                'status_breakdown'    => $statusBreakdown,
                'recent_patients'     => $recentPatients,
                'branch' => [
                    'id'       => $user->branch_id,
                    'name'     => $user->branch?->name ?? 'Main Branch',
                    'location' => $user->branch?->location ?? '',
                ],
            ],
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1\Lab;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\LabOrder;
use Carbon\Carbon;

class LabDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        // ── KPI counts ────────────────────────────────────────────────────────

        $pendingCount = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereIn('status', [LabOrder::STATUS_PENDING, LabOrder::STATUS_SENT_TO_LAB])
            ->count();

        $dueToday = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereNotIn('status', [LabOrder::STATUS_DELIVERED, LabOrder::STATUS_CANCELLED])
            ->whereDate('expected_ready_date', Carbon::today())
            ->count();

        $inProgressCount = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('status', LabOrder::STATUS_IN_PROGRESS)
            ->count();

        $completedThisWeek = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('status', LabOrder::STATUS_READY)
            ->whereBetween('updated_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
            ->count();

        // ── Recent orders (last 5) ────────────────────────────────────────────

        $recentOrders = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->with(['patient', 'orderingDentist', 'appointment'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($o) => $this->formatOrder($o));

        return response()->json([
            'success' => true,
            'data'    => [
                'pending_count'         => $pendingCount,
                'due_today'             => $dueToday,
                'in_progress_count'     => $inProgressCount,
                'completed_this_week'   => $completedThisWeek,
                'recent_orders'         => $recentOrders,
            ],
        ]);
    }

    private function formatOrder(LabOrder $o): array
    {
        return [
            'id'               => $o->id,
            'lab_order_number' => $o->lab_order_number,
            'order_type'       => $o->order_type,
            'material'         => $o->material,
            'tooth_numbers'    => $o->tooth_numbers,
            'status'           => $o->status,
            'expected_ready_date' => $o->expected_ready_date?->toDateString(),
            'patient_name'     => $o->patient?->full_name ?? '—',
            'ordering_dentist' => $o->orderingDentist?->name ?? '—',
            'created_at'       => $o->created_at?->toDateTimeString(),
        ];
    }
}

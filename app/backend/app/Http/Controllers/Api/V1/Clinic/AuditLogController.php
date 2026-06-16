<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Clinic-scoped audit log controller.
 * Clinic admin can only see events that belong to their own clinic.
 */
class AuditLogController extends Controller
{
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    /**
     * GET /api/v1/admin/audit-logs
     * Filters: ?event=, ?user_id=, ?from=, ?to=, ?search=, ?per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();

        $query = AuditLog::where('clinic_id', $clinicId)
            ->orderByDesc('created_at');

        if ($request->filled('event')) {
            $query->where('event', 'like', $request->event . '%');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('event',          'like', "%{$s}%")
                  ->orWhere('user_name',    'like', "%{$s}%")
                  ->orWhere('subject_label','like', "%{$s}%");
            });
        }

        $perPage = min((int) ($request->per_page ?? 30), 100);
        $logs    = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $logs->items(),
            'meta'    => [
                'total'        => $logs->total(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/audit-logs/events
     * Returns distinct event names for this clinic (for filter dropdown).
     */
    public function events(): JsonResponse
    {
        $events = AuditLog::where('clinic_id', $this->clinicId())
            ->distinct()
            ->orderBy('event')
            ->pluck('event');

        return response()->json([
            'success' => true,
            'data'    => $events,
        ]);
    }
}

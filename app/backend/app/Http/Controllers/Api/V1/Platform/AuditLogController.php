<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/v1/platform/audit-logs
     *
     * Queryable:
     *   ?clinic_id=1
     *   ?user_id=5
     *   ?event=clinic
     *   ?user_role=platform_admin|clinic_admin
     *   ?from=2026-01-01&to=2026-12-31
     *   ?per_page=50
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($request->filled('clinic_id')) {
            $query->where('clinic_id', $request->clinic_id);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('event')) {
            $query->where('event', 'like', $request->event . '%');
        }

        if ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
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
                $q->where('event',         'like', "%{$s}%")
                  ->orWhere('user_name',   'like', "%{$s}%")
                  ->orWhere('clinic_name', 'like', "%{$s}%")
                  ->orWhere('subject_label','like', "%{$s}%");
            });
        }

        $perPage = min((int) ($request->per_page ?? 50), 200);
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
     * GET /api/v1/platform/audit-logs/{id}
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $auditLog->load('user:id,name,email'),
        ]);
    }

    /**
     * GET /api/v1/platform/audit-logs/events
     * Returns distinct event names for filter dropdown.
     */
    public function events(): JsonResponse
    {
        $events = AuditLog::distinct()
            ->orderBy('event')
            ->pluck('event');

        return response()->json([
            'success' => true,
            'data'    => $events,
        ]);
    }
}

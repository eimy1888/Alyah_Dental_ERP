<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;

class NotificationController extends Controller
{
    // ── Get unread notifications ───────────────────────────
    // Appointments assigned to this dentist
    // but created by someone else (receptionist, branch manager)
    // that have not been marked as notified yet
    public function index(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $notifications = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->unnotified($dentistId)
            ->with(['patient', 'createdBy'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($a) => [
                'id'              => $a->id,
                'patient_name'    => $a->patient?->full_name ?? '—',
                'patient_id'      => $a->patient_id,
                'type'            => $a->type,
                'appointment_time'=> $a->appointment_time->toDateTimeString(),
                'date'            => $a->appointment_time->toDateString(),
                'time'            => $a->appointment_time->format('H:i'),
                'status'          => $a->status,
                'created_by_name' => $a->createdBy?->name ?? '—',
                'created_by_role' => $a->createdBy?->role ?? '—',
                'created_at'      => $a->created_at->toDateTimeString(),
                'is_notified'     => $a->is_notified,
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'notifications' => $notifications,
                'count'         => $notifications->count(),
            ],
        ]);
    }

    // ── Mark notifications as read ─────────────────────────
    // Accepts array of appointment ids
    // Sets is_notified = true for each
    public function markRead(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $request->validate([
            'ids'   => 'nullable|array',
            'ids.*' => 'integer|exists:appointments,id',
        ]);

        $query = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->where('is_notified', false);

        // If specific ids provided — mark only those
        // If no ids provided — mark all unread
        if ($request->filled('ids') && count($request->ids) > 0) {
            $query->whereIn('id', $request->ids);
        }

        $updated = $query->update(['is_notified' => true]);

        return response()->json([
            'success' => true,
            'message' => "{$updated} notification(s) marked as read.",
            'data'    => [
                'marked_count' => $updated,
            ],
        ]);
    }

    // ── Get notification count only ────────────────────────
    // Lightweight endpoint — called by polling every 30 seconds
    public function count(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $count = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->unnotified($dentistId)
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'count' => $count,
            ],
        ]);
    }
}
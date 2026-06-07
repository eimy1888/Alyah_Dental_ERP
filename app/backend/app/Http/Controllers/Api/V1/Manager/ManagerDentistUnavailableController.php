<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Appointment;
use App\Services\ReassignmentService;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerDentistUnavailableController extends Controller
{
    protected ReassignmentService $reassignmentService;
    protected AvailabilityService $availabilityService;

    public function __construct(
        ReassignmentService $reassignmentService,
        AvailabilityService $availabilityService
    ) {
        $this->reassignmentService = $reassignmentService;
        $this->availabilityService = $availabilityService;
    }

    /**
     * Get list of dentists with availability status
     *
     * GET /api/v1/manager/dentist-unavailable/dentists
     */
    public function getDentists(Request $request): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $dentists = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->dentists()
            ->with('user')
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'name' => $s->name,
                'specialization' => $s->specialization,
                'is_available' => !$s->isCurrentlyUnavailable(),
                'unavailable_reason' => $s->unavailable_reason,
                'unavailable_until' => $s->unavailable_until?->toDateTimeString(),
                'upcoming_appointments_count' => Appointment::where('dentist_id', $s->user_id)
                    ->whereDate('appointment_time', '>=', now()->startOfDay())
                    ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
                    ->count(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $dentists,
        ]);
    }

    /**
     * Mark a dentist as unavailable
     *
     * POST /api/v1/manager/dentist-unavailable/mark
     *
     * Body: {
     *   "dentist_id": 123,
     *   "reason": "sick_leave",
     *   "unavailable_until": "2026-06-01 09:00:00" (optional)
     * }
     */
    public function markUnavailable(Request $request): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'dentist_id' => 'required|integer|exists:staff,id',
            'reason' => 'required|string|in:sick_leave,vacation,late_arrival,left_early,emergency,other',
            'unavailable_until' => 'nullable|date|after:now',
            'notes' => 'nullable|string|max:500',
        ]);

        $dentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->whereHas('user', fn($q) => $q->where('role', 'dentist'))
            ->findOrFail($request->dentist_id);

        $unavailableUntil = $request->filled('unavailable_until')
            ? Carbon::parse($request->unavailable_until)
            : null;

        $reasonLabels = [
            'sick_leave' => 'Sick Leave',
            'vacation' => 'Vacation',
            'late_arrival' => 'Late Arrival',
            'left_early' => 'Left Early',
            'emergency' => 'Emergency',
            'other' => 'Other',
        ];

        $result = $this->reassignmentService->markDentistUnavailable(
            $dentist,
            $reasonLabels[$request->reason] ?? $request->reason,
            $unavailableUntil,
            $manager
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => [
                'dentist' => [
                    'id' => $dentist->id,
                    'name' => $dentist->name,
                ],
                'affected_appointments_count' => $result['count'],
                'affected_appointments' => $result['affected_appointments']->map(fn($a) => [
                    'id' => $a->id,
                    'patient_name' => $a->patient?->full_name,
                    'appointment_time' => $a->appointment_time->toDateTimeString(),
                    'status' => $a->status,
                ]),
            ],
        ]);
    }

    /**
     * Get affected appointments for an unavailable dentist
     *
     * GET /api/v1/manager/dentist-unavailable/{dentistId}/affected-appointments
     */
    public function getAffectedAppointments(Request $request, int $dentistId): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $dentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->findOrFail($dentistId);

        $appointments = $this->reassignmentService->getUpcomingAppointments(
            $dentist->user_id,
            $clinicId,
            $branchId,
            $request->get('days_ahead', 30)
        );

        return response()->json([
            'success' => true,
            'data' => [
                'dentist' => [
                    'id' => $dentist->id,
                    'name' => $dentist->name,
                ],
                'appointments' => $appointments->map(fn($a) => [
                    'id' => $a->id,
                    'patient_id' => $a->patient_id,
                    'patient_name' => $a->patient?->full_name,
                    'patient_phone' => $a->patient?->phone,
                    'appointment_time' => $a->appointment_time->toDateTimeString(),
                    'date' => $a->appointment_time->toDateString(),
                    'time' => $a->appointment_time->format('H:i'),
                    'duration_minutes' => $a->duration_minutes,
                    'type' => $a->type,
                    'status' => $a->status,
                ]),
                'total' => $appointments->count(),
            ],
        ]);
    }

    /**
     * Get available dentists for reassignment
     *
     * GET /api/v1/manager/dentist-unavailable/{dentistId}/available-dentists
     */
    public function getAvailableDentistsForReassignment(Request $request, int $dentistId): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $dentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->findOrFail($dentistId);

        $availableDentists = $this->reassignmentService->getAvailableDentistsForReassignment(
            $clinicId,
            $branchId,
            $dentist->user_id
        );

        return response()->json([
            'success' => true,
            'data' => $availableDentists->map(fn($s) => [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'name' => $s->name,
                'specialization' => $s->specialization,
                'queue_length' => \App\Models\QueueItem::where('dentist_id', $s->user_id)
                    ->where('status', 'waiting')
                    ->count(),
            ]),
        ]);
    }

    /**
     * Reassign a single appointment to another dentist
     *
     * POST /api/v1/manager/dentist-unavailable/reassign
     *
     * Body: {
     *   "appointment_id": 123,
     *   "to_dentist_id": 456,
     *   "reason": "Dentist on sick leave"
     * }
     */
    public function reassignAppointment(Request $request): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'appointment_id' => 'required|integer|exists:appointments,id',
            'to_dentist_id' => 'required|integer|exists:staff,id',
            'reason' => 'required|string|min:5|max:500',
        ]);

        // Get the appointment
        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->findOrFail($request->appointment_id);

        // Get target dentist
        $toDentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('id', $request->to_dentist_id)
            ->available()
            ->dentists()
            ->first();

        if (!$toDentist) {
            return response()->json([
                'success' => false,
                'message' => 'Selected dentist is not available for reassignment.',
            ], 422);
        }

        // Check if the new dentist is available at that time
        $isAvailable = $this->availabilityService->isDentistAvailableAt(
            $toDentist,
            $appointment->appointment_time,
            $appointment->duration_minutes
        );

        if (!$isAvailable) {
            return response()->json([
                'success' => false,
                'message' => 'Selected dentist is not available at the scheduled time. Please choose a different dentist or reschedule.',
                'code' => 'DENTIST_UNAVAILABLE_AT_TIME',
            ], 422);
        }

        // Perform reassignment
        $result = $this->reassignmentService->reassignAppointment(
            $appointment,
            $toDentist,
            $request->reason,
            $manager
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => [
                'appointment' => [
                    'id' => $appointment->id,
                    'patient_name' => $appointment->patient?->full_name,
                    'new_dentist_name' => $toDentist->name,
                ],
            ],
        ]);
    }

    /**
     * Reassign all appointments for an unavailable dentist
     *
     * POST /api/v1/manager/dentist-unavailable/reassign-all
     *
     * Body: {
     *   "dentist_id": 123,
     *   "to_dentist_id": 456,
     *   "reason": "Dentist on sick leave"
     * }
     */
    public function reassignAllAppointments(Request $request): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'dentist_id' => 'required|integer|exists:staff,id',
            'to_dentist_id' => 'required|integer|exists:staff,id',
            'reason' => 'required|string|min:5|max:500',
        ]);

        $fromDentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->findOrFail($request->dentist_id);

        $toDentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('id', $request->to_dentist_id)
            ->available()
            ->dentists()
            ->first();

        if (!$toDentist) {
            return response()->json([
                'success' => false,
                'message' => 'Selected dentist is not available for reassignment.',
            ], 422);
        }

        $appointments = $this->reassignmentService->getUpcomingAppointments(
            $fromDentist->user_id,
            $clinicId,
            $branchId,
            30
        );

        $successCount = 0;
        $failedCount = 0;
        $failedAppointments = [];

        foreach ($appointments as $appointment) {
            // Check availability
            $isAvailable = $this->availabilityService->isDentistAvailableAt(
                $toDentist,
                $appointment->appointment_time,
                $appointment->duration_minutes
            );

            if (!$isAvailable) {
                $failedCount++;
                $failedAppointments[] = [
                    'id' => $appointment->id,
                    'patient_name' => $appointment->patient?->full_name,
                    'appointment_time' => $appointment->appointment_time->toDateTimeString(),
                ];
                continue;
            }

            $result = $this->reassignmentService->reassignAppointment(
                $appointment,
                $toDentist,
                $request->reason . " (Bulk reassignment)",
                $manager
            );

            if ($result['success']) {
                $successCount++;
            } else {
                $failedCount++;
                $failedAppointments[] = [
                    'id' => $appointment->id,
                    'patient_name' => $appointment->patient?->full_name,
                    'appointment_time' => $appointment->appointment_time->toDateTimeString(),
                    'error' => $result['message'],
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Reassigned {$successCount} of {$appointments->count()} appointments.",
            'data' => [
                'total' => $appointments->count(),
                'success_count' => $successCount,
                'failed_count' => $failedCount,
                'failed_appointments' => $failedAppointments,
                'from_dentist' => $fromDentist->name,
                'to_dentist' => $toDentist->name,
            ],
        ]);
    }

    /**
     * Mark dentist as available again
     *
     * POST /api/v1/manager/dentist-unavailable/mark-available
     *
     * Body: { "dentist_id": 123 }
     */
    public function markAvailable(Request $request): JsonResponse
    {
        $manager = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'dentist_id' => 'required|integer|exists:staff,id',
        ]);

        $dentist = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->findOrFail($request->dentist_id);

        $dentist->markAvailable();

        return response()->json([
            'success' => true,
            'message' => "Dr. {$dentist->name} is now marked as available.",
            'data' => [
                'dentist_id' => $dentist->id,
                'name' => $dentist->name,
                'is_available' => true,
            ],
        ]);
    }
}
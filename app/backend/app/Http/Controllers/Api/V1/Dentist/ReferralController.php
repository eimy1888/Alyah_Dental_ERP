<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Staff;
use App\Services\ReassignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    protected ReassignmentService $reassignmentService;

    public function __construct(ReassignmentService $reassignmentService)
    {
        $this->reassignmentService = $reassignmentService;
    }

    /**
     * Get list of available dentists for referral
     *
     * GET /api/v1/dentist/referral/dentists
     */
    public function getAvailableDentists(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        // Get the current dentist as Staff model to get their staff ID
        $currentStaff = Staff::where('user_id', $user->id)
            ->where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->first();

        if (!$currentStaff) {
            return response()->json([
                'success' => false,
                'message' => 'Dentist record not found.',
                'data' => [],
            ], 404);
        }

        $dentists = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('id', '!=', $currentStaff->id)
            ->available()
            ->dentists()
            ->with('user')
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'name' => $s->name,
                'specialization' => $s->specialization,
            ]);

        return response()->json([
            'success' => true,
            'data' => $dentists,
        ]);
    }

    /**
     * Refer patient to another dentist
     *
     * POST /api/v1/dentist/referral/refer
     *
     * Body: {
     *   "appointment_id": 123,
     *   "to_dentist_id": 456,
     *   "reason": "Needs root canal treatment"
     * }
     */
    public function refer(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $request->validate([
            'appointment_id' => 'required|integer|exists:appointments,id',
            'to_dentist_id' => 'required|integer|exists:staff,id',
            'reason' => 'required|string|min:5|max:500',
        ]);

        // Get the appointment
        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $user->id)
            ->findOrFail($request->appointment_id);

        // Prevent referral if appointment is already completed or cancelled
        if (in_array($appointment->status, ['completed', 'cancelled', 'no_show'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot refer a completed or cancelled appointment.',
            ], 422);
        }

        // FIX: Get current dentist as Staff model
        $fromStaff = Staff::where('user_id', $user->id)
            ->where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->first();

        if (!$fromStaff) {
            return response()->json([
                'success' => false,
                'message' => 'Dentist record not found.',
            ], 404);
        }

        // Get target dentist as Staff model
        $toStaff = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('id', $request->to_dentist_id)
            ->available()
            ->dentists()
            ->first();

        if (!$toStaff) {
            return response()->json([
                'success' => false,
                'message' => 'Selected dentist is not available for referral.',
            ], 422);
        }

        // Perform referral with Staff models
        $result = $this->reassignmentService->referPatient(
            $appointment,
            $fromStaff,
            $toStaff,
            $request->reason,
            $user
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
                'appointment_id' => $appointment->id,
                'from_dentist' => $fromStaff->name,
                'to_dentist' => $toStaff->name,
                'reason' => $request->reason,
            ],
        ]);
    }
}
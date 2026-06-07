<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ManagerPatientController extends Controller
{
    private function manager(Request $request): User
    {
        return $request->user();
    }

    /**
     * GET /api/v1/manager/patients
     */
    public function index(Request $request): JsonResponse
    {
        $manager  = $this->manager($request);

        $patients = Patient::forClinic($manager->clinic_id)
            ->forBranch($manager->branch_id)
            ->with('branch:id,name')
            ->when($request->filled('search'), fn($q) => $q->search($request->search))
            ->when(
                $request->filled('gender') && $request->gender !== 'All',
                fn($q) => $q->where('gender', $request->gender)
            )
            ->orderBy('first_name')
            ->get()
            ->map->toApiArray();

        return response()->json([
            'success' => true,
            'data'    => $patients,
        ]);
    }

    /**
     * GET /api/v1/manager/patients/{patient}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $manager = $this->manager($request);

        $patient = Patient::forClinic($manager->clinic_id)
            ->forBranch($manager->branch_id)
            ->with('branch:id,name')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $patient->toApiArray(),
        ]);
    }

    /**
     * POST /api/v1/manager/patients
     */
    public function store(Request $request): JsonResponse
    {
        $manager  = $this->manager($request);
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $validated = $request->validate([
            'first_name'         => 'required|string|max:255',
            'last_name'          => 'required|string|max:255',
            'phone'              => 'required|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
        ]);

        // Auto-create patient portal user if email provided
        $portalUser = null;
        if (!empty($validated['email'])) {
            $portalUser = User::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'name'      => "{$validated['first_name']} {$validated['last_name']}",
                    'password'  => Hash::make($validated['phone']),
                    'role'      => 'patient',
                    'clinic_id' => $clinicId,
                    'branch_id' => $branchId,
                    'phone'     => $validated['phone'],
                    'is_active' => true,
                ]
            );
        }

        $patient = Patient::create([
            ...$validated,
            'clinic_id'  => $clinicId,
            'branch_id'  => $branchId,
            'user_id'    => $portalUser?->id,
            'created_by' => $manager->id,
            'status'     => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Patient registered successfully.' .
                ($portalUser ? ' Portal login created.' : ''),
            'data'    => $patient->load('branch:id,name')->toApiArray(),
        ], 201);
    }

    /**
     * PUT /api/v1/manager/patients/{patient}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $manager = $this->manager($request);

        $patient = Patient::forClinic($manager->clinic_id)
            ->forBranch($manager->branch_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'first_name'         => 'sometimes|string|max:255',
            'last_name'          => 'sometimes|string|max:255',
            'phone'              => 'sometimes|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
        ]);

        // Create portal user if email added and none exists
        if (!empty($validated['email']) && !$patient->user_id) {
            $portalUser = User::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'name'      => $patient->full_name,
                    'password'  => Hash::make($patient->phone ?? 'password'),
                    'role'      => 'patient',
                    'clinic_id' => $manager->clinic_id,
                    'branch_id' => $manager->branch_id,
                    'phone'     => $patient->phone,
                    'is_active' => true,
                ]
            );
            $validated['user_id'] = $portalUser->id;
        }

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Patient updated successfully.',
            'data'    => $patient->fresh('branch:id,name')->toApiArray(),
        ]);
    }

    /**
     * DELETE /api/v1/manager/patients/{patient}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $manager = $this->manager($request);

        $patient = Patient::forClinic($manager->clinic_id)
            ->forBranch($manager->branch_id)
            ->findOrFail($id);

        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Patient removed successfully.',
        ]);
    }

    /**
     * GET /api/v1/manager/patients/{id}/suggested-dentist
     */
    public function suggestedDentist(Request $request, int $id): JsonResponse
    {
        $manager  = $this->manager($request);

        $patient = Patient::forClinic($manager->clinic_id)
            ->forBranch($manager->branch_id)
            ->findOrFail($id);

        $lastAppointment = Appointment::where('clinic_id', $manager->clinic_id)
            ->where('patient_id', $patient->id)
            ->where('status', 'completed')
            ->orderByDesc('appointment_time')
            ->with('dentist')
            ->first();

        if (!$lastAppointment || !$lastAppointment->dentist) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'patient_id'             => $patient->id,
                    'patient_name'           => $patient->full_name,
                    'suggested_dentist'      => null,
                    'last_appointment_date'  => null,
                    'last_appointment_type'  => null,
                    'has_recent_appointment' => false,
                    'message'                => 'No previous completed appointments found.',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'patient_id'             => $patient->id,
                'patient_name'           => $patient->full_name,
                'suggested_dentist'      => [
                    'id'   => $lastAppointment->dentist->id,
                    'name' => $lastAppointment->dentist->name,
                ],
                'last_appointment_date'  => $lastAppointment->appointment_time->toDateString(),
                'last_appointment_type'  => $lastAppointment->type,
                'has_recent_appointment' => true,
                'message'                => "Continue with {$lastAppointment->dentist->name}?",
            ],
        ]);
    }
}
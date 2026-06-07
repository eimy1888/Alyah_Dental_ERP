<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    /**
     * GET /api/v1/admin/patients
     */
    public function index(Request $request): JsonResponse
    {
        $search   = $request->get('search', '');
        $status   = $request->get('status', '');
        $clinicId = $this->clinicId();

        $patients = Patient::forClinic($clinicId)
            ->with('branch:id,name')
            ->when($search, fn($q) => $q->search($search))
            ->when($status, fn($q) => $q->where('status', $status))
            ->orderBy('first_name')
            ->get()
            ->map->toApiArray();

        return response()->json([
            'success' => true,
            'data'    => $patients,
            'meta'    => [
                'total'  => $patients->count(),
                'active' => $patients->where('status', 'active')->count(),
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/patients/{patient}
     */
    public function show(Patient $patient): JsonResponse
    {
        if ($patient->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $patient->load([
            'branch:id,name',
            'invoices' => fn($q) => $q->latest()->limit(10),
            'payments' => fn($q) => $q->latest()->limit(10),
        ]);

        return response()->json([
            'success' => true,
            'data'    => array_merge($patient->toApiArray(), [
                'invoices' => $patient->invoices->map(fn($i) => [
                    'id'             => $i->id,
                    'invoice_number' => $i->invoice_number,
                    'total'          => $i->total,
                    'balance'        => $i->balance,
                    'status'         => $i->status,
                    'issued_at'      => $i->issued_at?->toDateString(),
                ]),
            ]),
        ]);
    }

    /**
     * POST /api/v1/admin/patients
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'         => 'required|string|max:255',
            'last_name'          => 'required|string|max:255',
            'phone'              => 'required|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'branch_id'          => 'nullable|integer|exists:branches,id',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
            'status'             => 'nullable|in:active,inactive,archived',
        ]);

        $patient = Patient::create([
            ...$validated,
            'clinic_id'  => $this->clinicId(),
            'created_by' => $request->user()->id,
            'status'     => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Patient registered successfully.',
            'data'    => $patient->load('branch:id,name')->toApiArray(),
        ], 201);
    }

    /**
     * PUT /api/v1/admin/patients/{patient}
     */
    public function update(Request $request, Patient $patient): JsonResponse
    {
        if ($patient->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'first_name'         => 'sometimes|string|max:255',
            'last_name'          => 'sometimes|string|max:255',
            'phone'              => 'sometimes|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'branch_id'          => 'nullable|integer|exists:branches,id',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
            'status'             => 'nullable|in:active,inactive,archived',
        ]);

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Patient updated.',
            'data'    => $patient->fresh('branch:id,name')->toApiArray(),
        ]);
    }

    /**
     * DELETE /api/v1/admin/patients/{patient}
     */
    public function destroy(Patient $patient): JsonResponse
    {
        if ($patient->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $patient->delete();

        return response()->json(['success' => true, 'message' => 'Patient removed.']);
    }
}
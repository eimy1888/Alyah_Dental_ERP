<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\XRay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class XRayController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $dentist = $request->user();
        $validated = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'appointment_id' => 'nullable|integer|exists:appointments,id',
            'file' => 'required|image|mimes:jpg,jpeg,png,webp|max:10240',
            'description' => 'nullable|string|max:2000',
            'taken_at' => 'nullable|date',
            'study_type' => 'nullable|string|max:100',
            'tooth_number' => 'nullable|string|max:50',
            'region' => 'nullable|string|max:100',
            'findings' => 'nullable|string|max:4000',
        ]);

        $patient = $this->patient($dentist, (int) $validated['patient_id']);
        if (!empty($validated['appointment_id'])) {
            Appointment::where('clinic_id', $dentist->clinic_id)
                ->where('branch_id', $dentist->branch_id)
                ->where('patient_id', $patient->id)
                ->findOrFail($validated['appointment_id']);
        }

        $path = $request->file('file')->store("xrays/clinic-{$dentist->clinic_id}", 'public');

        $xray = XRay::create([
            'clinic_id' => $dentist->clinic_id,
            'branch_id' => $dentist->branch_id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'uploaded_by' => $dentist->id,
            'appointment_id' => $validated['appointment_id'] ?? null,
            'study_type' => $validated['study_type'] ?? 'Dental X-Ray',
            'tooth_number' => $validated['tooth_number'] ?? null,
            'region' => $validated['region'] ?? null,
            'file_path' => $path,
            'file_name' => $request->file('file')->getClientOriginalName(),
            'file_size' => (string) $request->file('file')->getSize(),
            'description' => $validated['description'] ?? null,
            'status' => XRay::STATUS_READY_FOR_REVIEW,
            'findings' => $validated['findings'] ?? null,
            'captured_at' => $validated['taken_at'] ?? now()->toDateString(),
            'taken_at' => $validated['taken_at'] ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'X-ray uploaded.',
            'data' => $this->format($xray->fresh(['patient', 'dentist'])),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();
        $xray = XRay::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with(['patient', 'dentist'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->format($xray)]);
    }

    public function patientHistory(Request $request, int $patientId): JsonResponse
    {
        $dentist = $request->user();
        $this->patient($dentist, $patientId);

        $xrays = XRay::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forPatient($patientId)
            ->with('dentist')
            ->orderByDesc('taken_at')
            ->orderByDesc('captured_at')
            ->get()
            ->map(fn($xray) => $this->format($xray));

        return response()->json(['success' => true, 'data' => $xrays]);
    }

    private function patient(User $dentist, int $patientId): Patient
    {
        return Patient::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->findOrFail($patientId);
    }

    private function format(XRay $xray): array
    {
        return [
            'id' => $xray->id,
            'patient_id' => $xray->patient_id,
            'patient_name' => $xray->patient?->full_name,
            'appointment_id' => $xray->appointment_id,
            'uploaded_by' => $xray->uploaded_by,
            'file_path' => $xray->file_path,
            'file_url' => $xray->file_url,
            'description' => $xray->description,
            'taken_at' => $xray->taken_at?->toDateTimeString(),
            'study_type' => $xray->study_type,
            'tooth_number' => $xray->tooth_number,
            'region' => $xray->region,
            'findings' => $xray->findings,
            'status' => $xray->status,
        ];
    }
}

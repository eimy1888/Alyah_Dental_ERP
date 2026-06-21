<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrescriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $dentist = $request->user();
        $validated = $this->validatePayload($request);

        $patient = $this->patient($dentist, (int) $validated['patient_id']);
        $appointmentId = $validated['appointment_id'] ?? null;
        if ($appointmentId) {
            Appointment::where('clinic_id', $dentist->clinic_id)
                ->where('branch_id', $dentist->branch_id)
                ->where('patient_id', $patient->id)
                ->findOrFail($appointmentId);
        }

        $prescription = DB::transaction(function () use ($dentist, $patient, $validated, $appointmentId) {
            $first = $validated['items'][0];
            $prescription = Prescription::create([
                'clinic_id' => $dentist->clinic_id,
                'branch_id' => $dentist->branch_id,
                'patient_id' => $patient->id,
                'dentist_id' => $dentist->id,
                'appointment_id' => $appointmentId,
                'date' => $validated['date'] ?? now()->toDateString(),
                'issued_at' => $validated['date'] ?? now()->toDateString(),
                'notes' => $validated['notes'] ?? null,
                'status' => 'draft',
                'medication' => $first['drug_name'],
                'dosage' => $first['dosage'] ?? '',
                'duration_days' => $this->durationDays($first['duration'] ?? null),
                'instructions' => $first['instructions'] ?? null,
            ]);

            $prescription->items()->createMany($validated['items']);

            return $prescription;
        });

        return response()->json([
            'success' => true,
            'message' => 'Prescription draft created.',
            'data' => $this->format($prescription->fresh(['items', 'patient', 'dentist'])),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $prescription = $this->dentistPrescription($request->user(), $id);

        return response()->json(['success' => true, 'data' => $this->format($prescription)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();
        $prescription = $this->dentistPrescription($dentist, $id);

        if (!$prescription->isDraft()) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft prescriptions can be edited.',
                'code' => 'PRESCRIPTION_FINALIZED',
            ], 422);
        }

        $validated = $this->validatePayload($request, update: true);

        DB::transaction(function () use ($prescription, $validated) {
            $first = $validated['items'][0];
            $prescription->update([
                'date' => $validated['date'] ?? $prescription->date,
                'issued_at' => $validated['date'] ?? $prescription->issued_at,
                'notes' => $validated['notes'] ?? $prescription->notes,
                'medication' => $first['drug_name'],
                'dosage' => $first['dosage'] ?? '',
                'duration_days' => $this->durationDays($first['duration'] ?? null),
                'instructions' => $first['instructions'] ?? null,
            ]);
            $prescription->items()->delete();
            $prescription->items()->createMany($validated['items']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Prescription draft updated.',
            'data' => $this->format($prescription->fresh(['items', 'patient', 'dentist'])),
        ]);
    }

    public function finalize(Request $request, int $id): JsonResponse
    {
        $prescription = $this->dentistPrescription($request->user(), $id);
        $prescription->finalize();
        NotificationService::prescriptionIssued($prescription->fresh(['patient', 'dentist']));

        return response()->json([
            'success' => true,
            'message' => 'Prescription finalized.',
            'data' => $this->format($prescription->fresh(['items', 'patient', 'dentist'])),
        ]);
    }

    public function print(Request $request, int $id): JsonResponse
    {
        $prescription = $this->dentistPrescription($request->user(), $id);

        return response()->json([
            'success' => true,
            'data' => [
                'printable' => true,
                'prescription' => $this->format($prescription),
            ],
        ]);
    }

    public function patientHistory(Request $request, int $patientId): JsonResponse
    {
        $dentist = $request->user();
        $this->patient($dentist, $patientId);

        $items = Prescription::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forPatient($patientId)
            ->with(['items', 'dentist'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($prescription) => $this->format($prescription));

        return response()->json(['success' => true, 'data' => $items]);
    }

    private function validatePayload(Request $request, bool $update = false): array
    {
        return $request->validate([
            'patient_id' => [$update ? 'sometimes' : 'required', 'integer', 'exists:patients,id'],
            'appointment_id' => 'nullable|integer|exists:appointments,id',
            'date' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.drug_name' => 'required|string|max:255',
            'items.*.dosage' => 'nullable|string|max:255',
            'items.*.frequency' => 'nullable|string|max:255',
            'items.*.duration' => 'nullable|string|max:255',
            'items.*.instructions' => 'nullable|string|max:1000',
        ]);
    }

    private function dentistPrescription(User $dentist, int $id): Prescription
    {
        return Prescription::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with(['items', 'patient', 'dentist'])
            ->findOrFail($id);
    }

    private function patient(User $dentist, int $patientId): Patient
    {
        return Patient::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->findOrFail($patientId);
    }

    private function durationDays(?string $duration): int
    {
        if (!$duration) {
            return 1;
        }

        preg_match('/\d+/', $duration, $matches);
        return max(1, (int) ($matches[0] ?? 1));
    }

    private function format(Prescription $prescription): array
    {
        return [
            'id' => $prescription->id,
            'patient_id' => $prescription->patient_id,
            'patient_name' => $prescription->patient?->full_name,
            'dentist_id' => $prescription->dentist_id,
            'dentist_name' => $prescription->dentist?->name,
            'appointment_id' => $prescription->appointment_id,
            'date' => ($prescription->date ?? $prescription->issued_at)?->toDateString(),
            'notes' => $prescription->notes,
            'status' => $prescription->status ?? 'finalized',
            'finalized_at' => $prescription->finalized_at?->toDateTimeString(),
            'items' => $prescription->items->map(fn($item) => [
                'id' => $item->id,
                'drug_name' => $item->drug_name,
                'dosage' => $item->dosage,
                'frequency' => $item->frequency,
                'duration' => $item->duration,
                'instructions' => $item->instructions,
            ])->values(),
        ];
    }
}

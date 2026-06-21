<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalNoteController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $dentist = $request->user();
        $validated = $this->validatePayload($request);
        $patient = $this->patient($dentist, (int) $validated['patient_id']);

        if (!empty($validated['appointment_id'])) {
            Appointment::where('clinic_id', $dentist->clinic_id)
                ->where('branch_id', $dentist->branch_id)
                ->where('patient_id', $patient->id)
                ->findOrFail($validated['appointment_id']);
        }

        $note = ClinicalNote::create([
            'clinic_id' => $dentist->clinic_id,
            'branch_id' => $dentist->branch_id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_id' => $validated['appointment_id'] ?? null,
            'title' => $validated['title'],
            'note' => $validated['note'],
            'note_type' => $validated['title'],
            'content' => $validated['note'],
            'is_signed' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Clinical note draft created.',
            'data' => $this->format($note->fresh(['patient', 'dentist'])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();
        $note = $this->dentistNote($dentist, $id);

        if ($note->is_signed) {
            return response()->json([
                'success' => false,
                'message' => 'Signed clinical notes are read-only.',
                'code' => 'NOTE_SIGNED',
            ], 422);
        }

        $validated = $this->validatePayload($request, update: true);
        $note->update([
            'title' => $validated['title'] ?? $note->title,
            'note' => $validated['note'] ?? $note->note,
            'note_type' => $validated['title'] ?? $note->note_type,
            'content' => $validated['note'] ?? $note->content,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Clinical note updated.',
            'data' => $this->format($note->fresh(['patient', 'dentist'])),
        ]);
    }

    public function sign(Request $request, int $id): JsonResponse
    {
        $note = $this->dentistNote($request->user(), $id);
        $note->sign();

        return response()->json([
            'success' => true,
            'message' => 'Clinical note signed.',
            'data' => $this->format($note->fresh(['patient', 'dentist'])),
        ]);
    }

    public function patientHistory(Request $request, int $patientId): JsonResponse
    {
        $dentist = $request->user();
        $this->patient($dentist, $patientId);

        $notes = ClinicalNote::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forPatient($patientId)
            ->with('dentist')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($note) => $this->format($note));

        return response()->json(['success' => true, 'data' => $notes]);
    }

    private function validatePayload(Request $request, bool $update = false): array
    {
        return $request->validate([
            'patient_id' => [$update ? 'sometimes' : 'required', 'integer', 'exists:patients,id'],
            'appointment_id' => 'nullable|integer|exists:appointments,id',
            'title' => [$update ? 'sometimes' : 'required', 'string', 'max:255'],
            'note' => [$update ? 'sometimes' : 'required', 'string'],
        ]);
    }

    private function dentistNote(User $dentist, int $id): ClinicalNote
    {
        return ClinicalNote::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with(['patient', 'dentist'])
            ->findOrFail($id);
    }

    private function patient(User $dentist, int $patientId): Patient
    {
        return Patient::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->findOrFail($patientId);
    }

    private function format(ClinicalNote $note): array
    {
        return [
            'id' => $note->id,
            'patient_id' => $note->patient_id,
            'patient_name' => $note->patient?->full_name,
            'appointment_id' => $note->appointment_id,
            'dentist_id' => $note->dentist_id,
            'dentist_name' => $note->dentist?->name,
            'title' => $note->title ?? $note->note_type,
            'note' => $note->note ?? $note->content,
            'signed_at' => $note->signed_at?->toDateTimeString(),
            'is_signed' => (bool) $note->is_signed,
            'created_at' => $note->created_at?->toDateTimeString(),
        ];
    }
}

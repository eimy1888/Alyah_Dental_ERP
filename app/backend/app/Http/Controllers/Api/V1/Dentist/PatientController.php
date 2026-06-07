<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Prescription;
use App\Models\XRay;

class PatientController extends Controller
{
    // ── List patients ──────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        // Only patients who have had appointments with this dentist
        $query = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereHas('appointments', function ($q) use ($dentist) {
                $q->where('dentist_id', $dentist->id);
            })
            ->with(['appointments' => function ($q) use ($dentist) {
                $q->where('dentist_id', $dentist->id)
                  ->orderByDesc('appointment_time')
                  ->limit(1);
            }]);

        // Search
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $patients = $query
            ->orderBy('first_name')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $patients->map(fn($p) => $this->formatPatientList($p, $dentist->id)),
            'meta'    => [
                'total'        => $patients->total(),
                'current_page' => $patients->currentPage(),
                'last_page'    => $patients->lastPage(),
                'per_page'     => $patients->perPage(),
            ],
        ]);
    }

    // ── Show single patient ────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $patient = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereHas('appointments', function ($q) use ($dentist) {
                $q->where('dentist_id', $dentist->id);
            })
            ->findOrFail($id);

        // Appointments for this dentist only
        $appointments = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentist->id)
            ->where('patient_id', $id)
            ->orderByDesc('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'              => $a->id,
                'appointment_time'=> $a->appointment_time->toDateTimeString(),
                'date'            => $a->appointment_time->toDateString(),
                'time'            => $a->appointment_time->format('H:i'),
                'type'            => $a->type,
                'status'          => $a->status,
                'notes'           => $a->notes,
            ]);

        // Medical records unified timeline for this patient
        $medicalRecords = $this->buildMedicalTimeline(
            $patient->id,
            $dentist->id,
            $clinicId,
            $branchId
        );

        return response()->json([
            'success' => true,
            'data'    => [
                // Demographics
                'id'                 => $patient->id,
                'first_name'         => $patient->first_name,
                'last_name'          => $patient->last_name,
                'full_name'          => $patient->full_name,
                'phone'              => $patient->phone,
                'email'              => $patient->email,
                'date_of_birth'      => $patient->date_of_birth?->toDateString(),
                'age'                => $patient->age,
                'gender'             => $patient->gender,
                'city'               => $patient->city,
                'address'            => $patient->address,
                'status'             => $patient->status,

                // Insurance
                'insurance_provider' => $patient->insurance_provider,
                'insurance_number'   => $patient->insurance_number,

                // Static medical background
                'medical_history'    => $patient->medical_history ?? [],

                // Related records
                'appointments'       => $appointments,
                'medical_records'    => $medicalRecords,
            ],
        ]);
    }

    // ── Add clinical note ──────────────────────────────────
    public function addNote(Request $request, int $id): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $request->validate([
            'note_type'           => 'required|string|max:100',
            'content'             => 'required|string',
            'chief_complaint'     => 'nullable|string',
            'treatment_performed' => 'nullable|string',
            'follow_up'           => 'nullable|string',
            'vitals'              => 'nullable|array',
            'appointment_id'      => 'nullable|integer|exists:appointments,id',
        ]);

        // Ensure patient belongs to this dentist's clinic
        $patient = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->findOrFail($id);

        $note = ClinicalNote::create([
            'clinic_id'           => $clinicId,
            'branch_id'           => $branchId,
            'patient_id'          => $patient->id,
            'dentist_id'          => $dentist->id,
            'appointment_id'      => $request->appointment_id,
            'note_type'           => $request->note_type,
            'content'             => $request->content,
            'chief_complaint'     => $request->chief_complaint,
            'treatment_performed' => $request->treatment_performed,
            'follow_up'           => $request->follow_up,
            'vitals'              => $request->vitals,
            'is_signed'           => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Clinical note added successfully.',
            'data'    => [
                'id'              => $note->id,
                'note_type'       => $note->note_type,
                'content'         => $note->content,
                'content_snippet' => $note->content_snippet,
                'is_signed'       => $note->is_signed,
                'created_at'      => $note->created_at->toDateTimeString(),
            ],
        ]);
    }

    // ── Update insurance ───────────────────────────────────
    public function updateInsurance(Request $request, int $id): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $request->validate([
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:255',
        ]);

        $patient = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->findOrFail($id);

        $patient->update([
            'insurance_provider' => $request->insurance_provider,
            'insurance_number'   => $request->insurance_number,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Insurance information updated successfully.',
            'data'    => [
                'insurance_provider' => $patient->insurance_provider,
                'insurance_number'   => $patient->insurance_number,
            ],
        ]);
    }

    // ── Private: build unified medical timeline ────────────
    private function buildMedicalTimeline(
        int $patientId,
        int $dentistId,
        int $clinicId,
        int $branchId
    ): array {
        // Prescriptions
        $prescriptions = Prescription::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->forPatient($patientId)
            ->with('patient')
            ->get()
            ->map(fn($p) => $p->toMedicalRecord());

        // X-Rays
        $xRays = XRay::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->forPatient($patientId)
            ->with('patient')
            ->get()
            ->map(fn($x) => $x->toMedicalRecord());

        // Clinical Notes
        $clinicalNotes = ClinicalNote::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->forPatient($patientId)
            ->with('patient')
            ->get()
            ->map(fn($n) => $n->toMedicalRecord());

        // Appointments
        $appointments = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->forPatient($patientId)
            ->with('patient')
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'type'         => 'appointment',
                'patient_id'   => $a->patient_id,
                'patient_name' => $a->patient?->full_name ?? '—',
                'date'         => $a->appointment_time->toDateString(),
                'description'  => "Appointment: {$a->type}",
                'details'      => [
                    'status' => $a->status,
                    'notes'  => $a->notes,
                    'time'   => $a->appointment_time->format('H:i'),
                ],
            ]);

        // Merge all and sort by date descending
        return collect()
            ->merge($prescriptions)
            ->merge($xRays)
            ->merge($clinicalNotes)
            ->merge($appointments)
            ->sortByDesc('date')
            ->values()
            ->toArray();
    }

    // ── Private: format patient for list view ──────────────
    private function formatPatientList(Patient $patient, int $dentistId): array
    {
        $lastAppointment = $patient->appointments->first();

        return [
            'id'                 => $patient->id,
            'full_name'          => $patient->full_name,
            'first_name'         => $patient->first_name,
            'last_name'          => $patient->last_name,
            'phone'              => $patient->phone,
            'email'              => $patient->email,
            'gender'             => $patient->gender,
            'age'                => $patient->age,
            'city'               => $patient->city,
            'status'             => $patient->status,
            'insurance_provider' => $patient->insurance_provider,
            'last_visit'         => $lastAppointment
                ? $lastAppointment->appointment_time->toDateString()
                : null,
            'last_visit_type'    => $lastAppointment?->type ?? null,
            'last_visit_status'  => $lastAppointment?->status ?? null,
        ];
    }
}
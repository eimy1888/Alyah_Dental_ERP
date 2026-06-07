<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\ClinicalNote;
use App\Models\XRay;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get the patient ID from the logged-in user
     */
    private function getPatientId($user): ?int
    {
        // If user role is patient, get the linked patient id
        if ($user->role === 'patient') {
            // Check if user has a patient record linked
            if ($user->patient) {
                return $user->patient->id;
            }
            // Fallback: try to find patient by email
            $patient = \App\Models\Patient::where('email', $user->email)->first();
            if ($patient) {
                return $patient->id;
            }
            // Fallback: try by user_id
            $patient = \App\Models\Patient::where('user_id', $user->id)->first();
            if ($patient) {
                return $patient->id;
            }
        }
        return null;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => true,
                'data' => [
                    'clinic_profile' => [
                        'name' => 'Aylah Dental Clinic',
                        'address' => 'Addis Ababa, Ethiopia',
                        'description' => 'Premium restorative and cosmetic dentistry with real-time patient operations across urban branches.',
                        'features' => [
                            'Premium restorative dentistry',
                            'Real-time patient operations',
                            'Multi-branch network',
                            '24/7 patient support',
                        ],
                    ],
                    'recent_appointments' => [],
                    'recent_medical_records' => [],
                    'patient' => null,
                ],
            ]);
        }

        $patient = \App\Models\Patient::find($patientId);
        $clinic = $user->clinic;

        // ── Clinic Profile ─────────────────────────────────────────────
        $clinicProfile = [
            'name' => $clinic?->name ?? 'Aylah Dental Clinic',
            'address' => $clinic?->address ?? 'Addis Ababa, Ethiopia',
            'description' => 'Premium restorative and cosmetic dentistry with real-time patient operations across urban branches.',
            'features' => [
                'Premium restorative dentistry',
                'Real-time patient operations',
                'Multi-branch network',
                '24/7 patient support',
            ],
        ];

        // ── Patient Info for Card Status ─────────────────────────────────
        $patientInfo = $patient ? [
            'has_active_card' => $patient->hasActiveCard(),
            'card_number' => $patient->card_number,
            'no_show_count' => $patient->no_show_count,
            'requires_deposit' => $patient->requiresDeposit(),
        ] : null;

        // ── Recent Appointments (next 3 upcoming) ──────────────────────
        $recentAppointments = Appointment::where('patient_id', $patientId)
            ->where('appointment_time', '>=', Carbon::now())
            ->with('dentist')
            ->orderBy('appointment_time', 'asc')
            ->limit(3)
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'date' => $a->appointment_time->toDateString(),
                'time' => $a->appointment_time->format('H:i'),
                'dentist_name' => $a->dentist?->name ?? '—',
                'type' => $a->type,
                'status' => $a->status,
            ]);

        // ── Recent Medical Records (last 3 combined) ───────────────────
        $recentMedicalRecords = collect();

        // Prescriptions
        $prescriptions = Prescription::where('patient_id', $patientId)
            ->orderByDesc('issued_at')
            ->limit(1)
            ->get()
            ->map(fn($p) => [
                'type' => 'prescription',
                'date' => $p->issued_at->toDateString(),
                'title' => $p->medication,
                'description' => $p->dosage . ' · ' . $p->duration_days . ' days',
                'details' => [
                    'medication' => $p->medication,
                    'dosage' => $p->dosage,
                    'instructions' => $p->instructions,
                ],
            ]);

        // Clinical Notes
        $clinicalNotes = ClinicalNote::where('patient_id', $patientId)
            ->orderByDesc('created_at')
            ->limit(1)
            ->get()
            ->map(fn($n) => [
                'type' => 'clinical_note',
                'date' => $n->created_at->toDateString(),
                'title' => $n->note_type,
                'description' => $n->content_snippet ?? substr($n->content, 0, 100),
                'details' => [
                    'content' => $n->content,
                    'is_signed' => $n->is_signed,
                ],
            ]);

        // X-Rays
        $xRays = XRay::where('patient_id', $patientId)
            ->orderByDesc('captured_at')
            ->limit(1)
            ->get()
            ->map(fn($x) => [
                'type' => 'xray',
                'date' => $x->captured_at->toDateString(),
                'title' => $x->study_type,
                'description' => $x->region ?? 'Full arch',
                'details' => [
                    'study_type' => $x->study_type,
                    'findings' => $x->findings,
                    'status' => $x->status,
                ],
            ]);

        // Merge all and take last 3
        $recentMedicalRecords = $prescriptions
            ->merge($clinicalNotes)
            ->merge($xRays)
            ->sortByDesc('date')
            ->take(3)
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'clinic_profile' => $clinicProfile,
                'recent_appointments' => $recentAppointments,
                'recent_medical_records' => $recentMedicalRecords,
                'patient' => $patientInfo,
            ],
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Prescription;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        // ── 1. Metric cards ───────────────────────────────

        // Today's appointments count
        $myPatientsToday = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->today()
            ->count();

        // Cases currently in progress
        $casesInProgress = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->withStatus('in_progress')
            ->count();

        // Unsigned clinical notes
        $unsignedNotes = ClinicalNote::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->unsigned()
            ->count();

        // Urgent consults today
        $urgentConsults = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->today()
            ->where('type', 'like', '%urgent%')
            ->count();

        // ── 2. Caseload this week (last 7 days) ───────────
        $caseloadThisWeek = [];
        for ($i = 6; $i >= 0; $i--) {
            $date  = Carbon::today()->subDays($i);
            $count = Appointment::forClinic($clinicId)
                ->forBranch($branchId)
                ->forDentist($dentistId)
                ->whereDate('appointment_time', $date)
                ->count();

            $caseloadThisWeek[] = [
                'date'  => $date->toDateString(),
                'day'   => $date->format('D'),
                'count' => $count,
            ];
        }

        // ── 3. Today's appointments list ──────────────────
        $myAppointmentsToday = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->today()
            ->with('patient')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'time'         => $a->appointment_time->format('H:i'),
                'patient_name' => $a->patient?->full_name ?? '—',
                'patient_id'   => $a->patient_id,
                'type'         => $a->type,
                'status'       => $a->status,
                'queue'        => $a->queue_position,
                'notes'        => $a->notes,
            ]);

        // ── 4. Recent prescriptions (last 3) ─────────────
        $recentPrescriptions = Prescription::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->with('patient')
            ->orderByDesc('issued_at')
            ->limit(3)
            ->get()
            ->map(fn($p) => [
                'id'           => $p->id,
                'medication'   => $p->medication,
                'dosage'       => $p->dosage,
                'patient_name' => $p->patient?->full_name ?? '—',
                'patient_id'   => $p->patient_id,
                'issued_at'    => $p->issued_at->toDateString(),
            ]);

        // ── 5. Unsigned notes list (last 3) ───────────────
        $unsignedNotesList = ClinicalNote::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->unsigned()
            ->with('patient')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get()
            ->map(fn($n) => [
                'id'             => $n->id,
                'note_type'      => $n->note_type,
                'content_snippet'=> $n->content_snippet,
                'patient_name'   => $n->patient?->full_name ?? '—',
                'patient_id'     => $n->patient_id,
                'created_at'     => $n->created_at->toDateTimeString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                // Metric cards
                'my_patients_today'   => $myPatientsToday,
                'cases_in_progress'   => $casesInProgress,
                'unsigned_notes'      => $unsignedNotes,
                'urgent_consults'     => $urgentConsults,

                // Chart
                'my_caseload_this_week' => $caseloadThisWeek,

                // Lists
                'my_appointments_today'  => $myAppointmentsToday,
                'recent_prescriptions'   => $recentPrescriptions,
                'unsigned_notes_list'    => $unsignedNotesList,
            ],
        ]);
    }
}
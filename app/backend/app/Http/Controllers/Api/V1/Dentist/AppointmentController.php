<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use App\Models\Appointment;
use App\Models\Recall;
use App\Helpers\EthiopianTime;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $query = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->with(['patient', 'createdBy', 'invoice'])
            ->orderBy('appointment_time');

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('appointment_time', $request->date);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('appointment_time', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('appointment_time', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->whereHas('patient', function ($q) use ($term) {
                $q->where('first_name', 'like', "%{$term}%")
                  ->orWhere('last_name',  'like', "%{$term}%");
            });
        }

        $appointments = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $appointments->map(fn($a) => $this->formatAppointment($a)),
            'meta'    => [
                'total'        => $appointments->total(),
                'current_page' => $appointments->currentPage(),
                'last_page'    => $appointments->lastPage(),
                'per_page'     => $appointments->perPage(),
            ],
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $appointments = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->whereDate('appointment_time', today())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->with(['patient', 'invoice'])
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => $this->formatAppointment($a));

        $all = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->whereDate('appointment_time', today())
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'success' => true,
            'data'    => $appointments,
            'meta'    => [
                'total'       => $appointments->count(),
                'pending'     => (int)($all['pending']     ?? 0),
                'confirmed'   => (int)($all['confirmed']   ?? 0),
                'checked_in'  => (int)($all['checked_in']  ?? 0),
                'in_progress' => (int)($all['in_progress'] ?? 0),
                'completed'   => (int)($all['completed']   ?? 0),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $appointment = Appointment::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with(['patient', 'createdBy', 'clinicalNotes', 'prescriptions'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $this->formatAppointment($appointment, true),
        ]);
    }

    /**
     * Update appointment status with proper queue cleanup
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'confirmed',
                    'checked_in',
                    'in_progress',
                    'treatment_started',   
                    'completed',
                    'no_show',
                    'cancelled',
                ]),
            ],
            'new_datetime' => 'nullable|date|after:now',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $appointment = Appointment::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->findOrFail($id);

        $updateData = ['status' => $request->status];

        if ($request->status === 'cancelled' && $request->filled('new_datetime')) {
            $updateData = [
                'status'           => 'confirmed',
                'rescheduled_from' => $appointment->appointment_time,
                'appointment_time' => Carbon::parse($request->new_datetime),
                'reschedule_count' => $appointment->reschedule_count + 1,
            ];
        }

        if ($request->filled('notes')) {
            $updateData['notes'] = $request->notes;
        }

        if ($request->status === 'completed' && ($blocker = $appointment->completionBlocker())) {
            return response()->json([
                'success' => false,
                'message' => $blocker['message'],
                'code' => $blocker['code'],
                'data' => $blocker,
            ], 422);
        }

        // ── FIX: Properly update queue item and remove from active queue ──
        if ($request->status === 'in_progress') {
            \App\Models\QueueItem::where('appointment_id', $appointment->id)
                ->where('status', 'waiting')
                ->update([
                    'status' => 'in_progress',
                    'started_at' => now(),
                ]);
        }

        if ($request->status === 'treatment_started') {
    \App\Models\QueueItem::where('appointment_id', $appointment->id)
        ->where('status', 'in_progress')
        ->update(['status' => 'in_progress']); // stays in progress in queue
}
        
        if ($request->status === 'completed') {
            // Set queue item to 'completed' - this removes it from active queue views
            \App\Models\QueueItem::where('appointment_id', $appointment->id)
                ->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
            \App\Models\QueueItem::recalculatePositions($appointment->clinic_id, $appointment->branch_id, $appointment->dentist_id);
        }
        
        if ($request->status === 'cancelled' || $request->status === 'no_show') {
            \App\Models\QueueItem::where('appointment_id', $appointment->id)
                ->update([
                    'status' => 'removed',
                    'completed_at' => now(),
                ]);
            \App\Models\QueueItem::recalculatePositions($appointment->clinic_id, $appointment->branch_id, $appointment->dentist_id);
        }

        $appointment->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Appointment status updated successfully.',
            'data'    => $this->formatAppointment(
                $appointment->fresh(['patient', 'createdBy'])
            ),
        ]);
    }

    public function setRecall(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'recall_interval_months' => 'required|integer|min:1|max:24',
            'notes'                  => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with('patient')
            ->findOrFail($id);

        if ($appointment->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Recall can only be set for completed appointments.',
            ], 422);
        }

        $existingRecall = Recall::where('appointment_id', $appointment->id)->first();
        if ($existingRecall) {
            return response()->json([
                'success' => false,
                'message' => 'A recall has already been set for this appointment.',
                'data'    => $this->formatRecall($existingRecall),
            ], 409);
        }

        $intervalMonths = (int) $request->recall_interval_months;
        $dueDate        = now()->addMonths($intervalMonths)->startOfDay();

        $recall = Recall::create([
            'clinic_id'              => $dentist->clinic_id,
            'branch_id'              => $dentist->branch_id,
            'patient_id'             => $appointment->patient_id,
            'appointment_id'         => $appointment->id,
            'dentist_id'             => $dentist->id,
            'recall_interval_months' => $intervalMonths,
            'due_date'               => $dueDate,
            'status'                 => 'pending',
            'notes'                  => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Recall set for {$dueDate->toDateString()} ({$intervalMonths} months).",
            'data'    => $this->formatRecall($recall),
        ], 201);
    }

    public function recalls(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $recalls = Recall::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->with(['patient', 'appointment'])
            ->orderBy('due_date')
            ->get()
            ->map(fn($r) => $this->formatRecall($r));

        return response()->json([
            'success' => true,
            'data'    => $recalls,
        ]);
    }

    public function signNote(Request $request, int $noteId): JsonResponse
    {
        $dentist = $request->user();

        $note = \App\Models\ClinicalNote::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->findOrFail($noteId);

        if ($note->is_signed) {
            return response()->json([
                'success' => false,
                'message' => 'Note is already signed.',
            ], 422);
        }

        $note->sign();

        return response()->json([
            'success' => true,
            'message' => 'Clinical note signed successfully.',
            'data'    => [
                'id'        => $note->id,
                'is_signed' => $note->is_signed,
                'signed_at' => $note->signed_at?->toDateTimeString(),
            ],
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $dentist      = $request->user();
        $appointments = \App\Models\Appointment::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->with(['patient'])
            ->when($request->filled('from_date'), fn($q) => $q->whereDate('appointment_time', '>=', $request->from_date))
            ->when($request->filled('to_date'),   fn($q) => $q->whereDate('appointment_time', '<=', $request->to_date))
            ->when($request->filled('status') && $request->status !== 'All', fn($q) => $q->where('status', $request->status))
            ->orderBy('appointment_time')
            ->limit(1000)
            ->get();

        $rows   = [];
        $rows[] = ['Date', 'Time', 'Patient', 'Type', 'Status', 'Duration (min)', 'Notes'];

        foreach ($appointments as $a) {
            $rows[] = [
                $a->appointment_time->format('d M Y'),
                $a->appointment_time->format('H:i'),
                $a->patient?->full_name ?? '—',
                $a->type,
                ucfirst(str_replace('_', ' ', $a->status)),
                $a->duration_minutes,
                $a->notes ?? '',
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Appointment export ready.',
            'data'    => [
                'headers'       => $rows[0],
                'rows'          => array_slice($rows, 1),
                'total_records' => $appointments->count(),
            ],
        ]);
    }

    private function formatAppointment(Appointment $a, bool $detailed = false): array
    {
        $base = [
            'id'               => $a->id,
            'patient_id'       => $a->patient_id,
            'patient_name'     => $a->patient?->full_name ?? '—',
            'patient_phone'    => $a->patient?->phone     ?? '—',
            'appointment_time' => $a->appointment_time->toDateTimeString(),
            'date'             => $a->appointment_time->toDateString(),
            'time'             => $a->appointment_time->format('H:i'),
            'time_ett'         => EthiopianTime::toEthiopian($a->appointment_time),
            'time_ett_raw'     => EthiopianTime::toEthiopianRaw($a->appointment_time),
            'duration_minutes' => $a->duration_minutes,
            'type'             => $a->type,
            'status'           => $a->status,
            'notes'            => $a->notes,
            'queue_position'   => $a->queue_position,
            'reschedule_count' => $a->reschedule_count,
            'rescheduled_from' => $a->rescheduled_from?->toDateTimeString(),
            'created_by_name'  => $a->createdBy?->name ?? '—',
            'is_notified'      => $a->is_notified,
            'branch_id'        => $a->branch_id,
            'invoice_paid' => $this->isInvoicePaid($a),
        ];

        if ($detailed) {
            $base['clinical_notes'] = $a->clinicalNotes?->map(fn($n) => [
                'id'              => $n->id,
                'note_type'       => $n->note_type,
                'content'         => $n->content,
                'content_snippet' => $n->content_snippet,
                'is_signed'       => $n->is_signed,
                'signed_at'       => $n->signed_at?->toDateTimeString(),
                'created_at'      => $n->created_at->toDateTimeString(),
            ]);

            $base['prescriptions'] = $a->prescriptions?->map(fn($p) => [
                'id'            => $p->id,
                'medication'    => $p->medication,
                'dosage'        => $p->dosage,
                'duration_days' => $p->duration_days,
                'instructions'  => $p->instructions,
                'issued_at'     => $p->issued_at->toDateString(),
            ]);
        }

        return $base;
    }

    private function formatRecall(Recall $r): array
    {
        return [
            'id'                     => $r->id,
            'patient_id'             => $r->patient_id,
            'patient_name'           => $r->patient?->full_name ?? '—',
            'appointment_id'         => $r->appointment_id,
            'recall_interval_months' => $r->recall_interval_months,
            'due_date'               => $r->due_date->toDateString(),
            'days_until_due'         => (int) now()->startOfDay()->diffInDays($r->due_date, false),
            'notification_sent'      => $r->notification_sent,
            'notification_sent_at'   => $r->notification_sent_at?->toDateString(),
            'status'                 => $r->status,
            'notes'                  => $r->notes,
            'created_at'             => $r->created_at->toDateString(),
        ];
    }

    private function isInvoicePaid(Appointment $a): bool
{
    // Load invoice if not already loaded
    $invoice = $a->relationLoaded('invoice') 
        ? $a->invoice 
        : $a->invoice()->first();
    
    if (!$invoice) return false;
    
    // Paid means balance is 0 or less
    return (float)($invoice->balance ?? $invoice->balance_due ?? PHP_INT_MAX) <= 0;
}
}

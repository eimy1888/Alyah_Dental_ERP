<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\WaitlistEntry;
use App\Models\QueueItem;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ManagerWaitlistController extends Controller
{
    // ── GET /manager/waitlist ─────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        // 1. Waitlist entries (walk-ins not yet assigned)
        $waitlistQuery = WaitlistEntry::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where(function ($q) {
                $q->whereDate('arrived_at', today())
                  ->orWhereDate('created_at', today());
            })
            ->with('patient')
            ->orderByRaw("FIELD(priority, 'urgent', 'normal')")
            ->orderBy('arrived_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $waitlistQuery->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $waitlistQuery->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $waitlistEntries = $waitlistQuery->get();

        // 2. Live queue items
        $queueItems = QueueItem::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'dentist', 'appointment'])
            ->orderByRaw("FIELD(priority, 'emergency', 'scheduled', 'walk_in', 'late_arrival')")
            ->orderBy('position')
            ->get();

        // Transform waitlist
        $transformedWaitlist = $waitlistEntries->map(fn($e) => [
            'id' => $e->id,
            'type' => 'waitlist',
            'name' => $e->name,
            'phone' => $e->phone,
            'priority' => $e->priority,
            'status' => $e->status,
            'arrived_at' => $e->arrived_at?->toDateTimeString(),
            'waiting_time' => $e->arrived_at ? now()->diffInMinutes($e->arrived_at) : 0,
            'medical_cases' => $e->medical_cases,
            'patient_id' => $e->patient_id,
            'patient_name' => $e->patient?->full_name,
            'dentist_name' => null,
            'position' => null,
            'appointment_type' => null,
        ]);

        // Transform queue
        $transformedQueue = $queueItems->map(fn($q) => [
            'id' => $q->id,
            'type' => 'queue',
            'name' => $q->patient?->full_name ?? '—',
            'phone' => $q->patient?->phone ?? '—',
            'priority' => $q->priority,
            'status' => $q->status,
            'arrived_at' => $q->created_at?->toDateTimeString(),
            'waiting_time' => $q->created_at ? now()->diffInMinutes($q->created_at) : 0,
            'medical_cases' => null,
            'patient_id' => $q->patient_id,
            'patient_name' => $q->patient?->full_name,
            'dentist_name' => $q->dentist?->name ?? '—',
            'position' => $q->position,
            'appointment_type' => $q->appointment?->type ?? 'Walk-in',
        ]);

        // Combine and sort
        $combined = $transformedWaitlist->concat($transformedQueue)->sortBy(function($item) {
            if ($item['type'] === 'waitlist') {
                return $item['priority'] === 'urgent' ? 0 : 1;
            }
            return 2 + ($item['position'] ?? 999);
        })->values();

        $waitingCount = $transformedWaitlist->where('status', 'waiting')->count() + $transformedQueue->where('status', 'waiting')->count();
        $inServiceCount = $transformedQueue->where('status', 'in_progress')->count();

        return response()->json([
            'success' => true,
            'data' => $combined,
            'meta' => [
                'total' => $combined->count(),
                'waiting' => $waitingCount,
                'in_service' => $inServiceCount,
                'done' => 0,
                'waitlist_count' => $transformedWaitlist->count(),
                'queue_count' => $transformedQueue->count(),
            ],
        ]);
    }

    // ── POST /manager/waitlist ────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $validated = $request->validate([
            'patient_id'           => 'nullable|exists:patients,id',
            'name'                 => 'required|string|max:200',
            'phone'                => 'nullable|string|max:30',
            'current_medical_case' => 'nullable|string|max:1000',
            'priority'             => 'required|in:urgent,normal',
            'dentist_id'           => 'required|exists:users,id',
            'service_id'           => 'required|exists:services,id',
        ]);

        // Get or create patient
        $patient = null;
        if (!empty($validated['patient_id'])) {
            $patient = Patient::find($validated['patient_id']);
        }

        if (!$patient && !empty($validated['phone'])) {
            $patient = Patient::where('clinic_id', $clinicId)
                ->where('branch_id', $branchId)
                ->where('phone', $validated['phone'])
                ->first();
        }

        if (!$patient) {
            $nameParts = explode(' ', trim($validated['name']), 2);
            $patient = Patient::create([
                'clinic_id'     => $clinicId,
                'branch_id'     => $branchId,
                'first_name'    => $nameParts[0] ?? $validated['name'],
                'last_name'     => $nameParts[1] ?? '',
                'phone'         => $validated['phone'] ?? '',
                'status'        => 'active',
                'created_by'    => $user->id,
            ]);
        }

        // Push medical case
        if (!empty($validated['current_medical_case'])) {
            $patient->pushMedicalCase($validated['current_medical_case'], 'waitlist');
        }

        // Get dentist and service
        $dentist = User::where('clinic_id', $clinicId)
            ->where('role', 'dentist')
            ->where('is_active', true)
            ->find($validated['dentist_id']);

        $service = Service::where('clinic_id', $clinicId)
            ->find($validated['service_id']);

        $directConversion = false;
        $queueItem = null;
        $appointment = null;

        if ($dentist && $service) {
            $now = Carbon::now();
            $duration = $service->duration_minutes ?? 30;
            $slotEnd = (clone $now)->addMinutes($duration);

            // Check for overlapping appointments
            $hasOverlap = Appointment::where('clinic_id', $clinicId)
                ->where('branch_id', $branchId)
                ->where('dentist_id', $dentist->id)
                ->whereDate('appointment_time', $now->toDateString())
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->where(function ($query) use ($now, $slotEnd) {
                    $query->where('appointment_time', '<', $slotEnd)
                          ->whereRaw("DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE) > ?", [$now]);
                })
                ->exists();

            if (!$hasOverlap) {
                $directConversion = true;

                // Create appointment
                $appointment = Appointment::create([
                    'clinic_id'        => $clinicId,
                    'branch_id'        => $branchId,
                    'patient_id'       => $patient->id,
                    'dentist_id'       => $dentist->id,
                    'appointment_time' => $now,
                    'duration_minutes' => $duration,
                    'type'             => $service->name,
                    'notes'            => $validated['current_medical_case'] ?? 'Walk-in',
                    'status'           => 'checked_in',
                    'check_in_time'    => $now,
                    'created_by'       => $user->id,
                ]);

                // Create queue item with priority
                $priority = $validated['priority'] === 'urgent' ? 'emergency' : 'walk_in';

                if ($priority === 'emergency') {
                    // Shift all waiting items down
                    QueueItem::where('clinic_id', $clinicId)
                        ->where('branch_id', $branchId)
                        ->where('dentist_id', $dentist->id)
                        ->where('status', 'waiting')
                        ->increment('position');
                    $position = 1;
                } else {
                    $position = (QueueItem::where('clinic_id', $clinicId)
                        ->where('branch_id', $branchId)
                        ->where('dentist_id', $dentist->id)
                        ->where('status', 'waiting')
                        ->max('position') ?? 0) + 1;
                }

                $queueItem = QueueItem::create([
                    'clinic_id'      => $clinicId,
                    'branch_id'      => $branchId,
                    'appointment_id' => $appointment->id,
                    'patient_id'     => $patient->id,
                    'dentist_id'     => $dentist->id,
                    'priority'       => $priority,
                    'position'       => $position,
                    'status'         => 'waiting',
                    'notes'          => $validated['current_medical_case'] ?? 'Walk-in',
                ]);
            }
        }

        // If direct conversion failed, add to waitlist
        if (!$directConversion) {
            $medicalCases = [];
            if (!empty($validated['current_medical_case'])) {
                $medicalCases[] = [
                    'case'     => $validated['current_medical_case'],
                    'added_at' => now()->toIso8601String(),
                    'source'   => 'waitlist',
                ];
            }

            $entry = WaitlistEntry::create([
                'clinic_id'     => $clinicId,
                'branch_id'     => $branchId,
                'patient_id'    => $patient->id,
                'name'          => $validated['name'],
                'phone'         => $validated['phone'] ?? null,
                'medical_cases' => !empty($medicalCases) ? $medicalCases : null,
                'priority'      => $validated['priority'],
                'status'        => 'waiting',
                'arrived_at'    => now(),
                'created_by'    => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'No slot available. Patient added to waitlist.',
                'data' => $entry->toApiArray(),
                'direct_conversion' => false,
            ], 201);
        }

        // Direct conversion successful
        return response()->json([
            'success' => true,
            'message' => 'Patient added to live queue immediately.',
            'data' => [
                'appointment' => $appointment,
                'queue_item' => $queueItem,
                'patient' => $patient->toApiArray(),
            ],
            'direct_conversion' => true,
        ], 201);
    }

    // ── PUT /manager/waitlist/{waitlistEntry} ─────────────────
    public function update(Request $request, WaitlistEntry $waitlistEntry): JsonResponse
    {
        $user = $request->user();

        if ($waitlistEntry->clinic_id !== $user->clinic_id ||
            $waitlistEntry->branch_id !== $user->branch_id) {
            return response()->json(['success' => false, 'message' => 'Entry not found.'], 404);
        }

        $validated = $request->validate([
            'name'                 => 'sometimes|string|max:200',
            'phone'                => 'nullable|string|max:30',
            'current_medical_case' => 'nullable|string|max:1000',
            'priority'             => 'sometimes|in:urgent,normal',
            'status'               => 'sometimes|in:waiting,called,in_service,done,left,removed',
        ]);

        if (!empty($validated['current_medical_case'])) {
            $cases   = $waitlistEntry->medical_cases ?? [];
            $cases[] = [
                'case'     => $validated['current_medical_case'],
                'added_at' => now()->toIso8601String(),
                'source'   => 'waitlist_edit',
            ];
            $waitlistEntry->medical_cases = $cases;

            if ($waitlistEntry->patient_id) {
                $patient = Patient::find($waitlistEntry->patient_id);
                if ($patient) {
                    $patient->pushMedicalCase($validated['current_medical_case'], 'waitlist_edit');
                }
            }
        }

        if (isset($validated['name']))     $waitlistEntry->name     = $validated['name'];
        if (isset($validated['phone']))    $waitlistEntry->phone    = $validated['phone'];
        if (isset($validated['priority'])) $waitlistEntry->priority = $validated['priority'];
        if (isset($validated['status']))   $waitlistEntry->status   = $validated['status'];

        $waitlistEntry->save();
        $waitlistEntry->load('patient');

        return response()->json([
            'success' => true,
            'message' => 'Entry updated.',
            'data'    => $waitlistEntry->toApiArray(),
        ]);
    }

    // ── DELETE /manager/waitlist/{waitlistEntry} ──────────────
    public function destroy(Request $request, WaitlistEntry $waitlistEntry): JsonResponse
    {
        $user = $request->user();

        if ($waitlistEntry->clinic_id !== $user->clinic_id ||
            $waitlistEntry->branch_id !== $user->branch_id) {
            return response()->json(['success' => false, 'message' => 'Entry not found.'], 404);
        }

        $waitlistEntry->update(['status' => 'removed']);

        return response()->json([
            'success' => true,
            'message' => 'Entry removed from waitlist.',
        ]);
    }

    // ── POST /manager/waitlist/{waitlistEntry}/convert ────────
    public function convertToAppointment(Request $request, WaitlistEntry $waitlistEntry): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        if ($waitlistEntry->clinic_id !== $clinicId ||
            $waitlistEntry->branch_id !== $branchId) {
            return response()->json(['success' => false, 'message' => 'Waitlist entry not found.'], 404);
        }

        $request->validate([
            'dentist_id' => 'required|exists:users,id',
            'reason'     => 'nullable|string|max:500',
        ]);

        $dentist = User::where('clinic_id', $clinicId)
            ->where('role', 'dentist')
            ->where('is_active', true)
            ->findOrFail($request->dentist_id);

        // Find or create patient
        $patient = null;

        if ($waitlistEntry->patient_id) {
            $patient = Patient::find($waitlistEntry->patient_id);
        }

        if (!$patient && $waitlistEntry->phone) {
            $patient = Patient::where('clinic_id', $clinicId)
                ->where('branch_id', $branchId)
                ->where('phone', $waitlistEntry->phone)
                ->first();
        }

        if (!$patient) {
            $nameParts = explode(' ', trim($waitlistEntry->name), 2);
            $patient   = Patient::create([
                'clinic_id'     => $clinicId,
                'branch_id'     => $branchId,
                'first_name'    => $nameParts[0] ?? $waitlistEntry->name,
                'last_name'     => $nameParts[1] ?? '',
                'phone'         => $waitlistEntry->phone ?? '',
                'status'        => 'active',
                'created_by'    => $user->id,
                'medical_cases' => $waitlistEntry->medical_cases,
            ]);
        }

        $lastCase = $waitlistEntry->last_medical_case;
        if ($lastCase) {
            $patient->pushMedicalCase($lastCase, 'emergency_convert');
        }

        $reasonNote = $request->reason ?? $lastCase ?? 'Emergency conversion from waitlist';

        $appointment = Appointment::create([
            'clinic_id'        => $clinicId,
            'branch_id'        => $branchId,
            'patient_id'       => $patient->id,
            'dentist_id'       => $dentist->id,
            'appointment_time' => now(),
            'duration_minutes' => 30,
            'type'             => 'Emergency',
            'status'           => 'checked_in',
            'check_in_time'    => now(),
            'notes'            => 'CONVERTED FROM WAITLIST: ' . $reasonNote,
            'created_by'       => $user->id,
        ]);

        QueueItem::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->id)
            ->where('status', 'waiting')
            ->increment('position');

        $queueItem = QueueItem::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $branchId,
            'appointment_id' => $appointment->id,
            'patient_id'     => $patient->id,
            'dentist_id'     => $dentist->id,
            'priority'       => 'emergency',
            'position'       => 1,
            'status'         => 'waiting',
            'notes'          => 'EMERGENCY CONVERSION: ' . $reasonNote,
        ]);

        $waitlistEntry->update(['status' => 'in_service']);

        return response()->json([
            'success' => true,
            'message' => "Emergency appointment created for {$patient->full_name} with {$dentist->name}. Added to queue as priority #1.",
            'data'    => [
                'appointment' => [
                    'id'           => $appointment->id,
                    'patient_name' => $patient->full_name,
                    'dentist_name' => $dentist->name,
                    'type'         => $appointment->type,
                    'status'       => $appointment->status,
                ],
                'queue_item' => [
                    'id'       => $queueItem->id,
                    'position' => $queueItem->position,
                    'priority' => $queueItem->priority,
                ],
                'waitlist_entry' => [
                    'id'     => $waitlistEntry->id,
                    'status' => $waitlistEntry->status,
                ],
            ],
        ], 201);
    }
}
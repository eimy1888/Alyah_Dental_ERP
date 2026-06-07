<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

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

class WaitlistController extends Controller
{
    private function clinicId(): int
    {
        return auth()->user()->clinic_id;
    }

    private function branchId(): ?int
    {
        return auth()->user()->branch_id;
    }

    // ── GET /receptionist/waitlist (SHOWS BOTH WAITLIST AND LIVE QUEUE) ──
    public function index(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();
        $branchId = $this->branchId();

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

        // 2. Live queue items (patients checked in and waiting/in_progress)
        $queueItems = QueueItem::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'dentist', 'appointment'])
            ->orderByRaw("FIELD(priority, 'emergency', 'scheduled', 'walk_in', 'late_arrival')")
            ->orderBy('position')
            ->get();

        // Transform waitlist entries
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

        // Transform queue items
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
            // Queue items: position is numeric, but we need to preserve order
            return 2 + ($item['position'] ?? 999);
        })->values();

        $waitingCount = $transformedWaitlist->where('status', 'waiting')->count() + $transformedQueue->where('status', 'waiting')->count();
        $inServiceCount = $transformedQueue->where('status', 'in_progress')->count();

        $user = auth()->user();

        return response()->json([
            'success' => true,
            'data' => $combined,
            'meta' => [
                'total' => $combined->count(),
                'waiting' => $waitingCount,
                'in_service' => $inServiceCount,
                'done' => 0,
                'user_name' => $user->name,
                'user_role' => $user->role,
                'waitlist_count' => $transformedWaitlist->count(),
                'queue_count' => $transformedQueue->count(),
            ],
        ]);
    }

    // ── POST /receptionist/waitlist ───────────────────────────
    public function store(Request $request): JsonResponse
    {
        $user     = auth()->user();
        $clinicId = $this->clinicId();
        $branchId = $this->branchId();

        $validated = $request->validate([
            'patient_id'           => 'nullable|exists:patients,id',
            'name'                 => 'required|string|max:200',
            'phone'                => 'nullable|string|max:20',
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

        // Push medical case to patient
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

            // Check if dentist has a free slot at this time
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
                    // Shift all waiting items down by 1
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

    // ── PUT /receptionist/waitlist/{id} ───────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $entry = WaitlistEntry::where('id', $id)
            ->where('clinic_id', $this->clinicId())
            ->where('branch_id', $this->branchId())
            ->with('patient')
            ->firstOrFail();

        $validated = $request->validate([
            'name'                 => 'sometimes|string|max:200',
            'phone'                => 'nullable|string|max:20',
            'current_medical_case' => 'nullable|string|max:1000',
            'priority'             => 'sometimes|in:urgent,normal',
            'status'               => 'sometimes|in:waiting,called,in_service,done,left,removed',
        ]);

        // Append new case if provided
        if (!empty($validated['current_medical_case'])) {
            $cases   = $entry->medical_cases ?? [];
            $cases[] = [
                'case'     => $validated['current_medical_case'],
                'added_at' => now()->toIso8601String(),
                'source'   => 'waitlist_edit',
            ];
            $entry->medical_cases = $cases;

            if ($entry->patient_id) {
                $patient = Patient::find($entry->patient_id);
                if ($patient) {
                    $patient->pushMedicalCase($validated['current_medical_case'], 'waitlist_edit');
                }
            }
        }

        if (isset($validated['name']))     $entry->name     = $validated['name'];
        if (isset($validated['phone']))    $entry->phone    = $validated['phone'];
        if (isset($validated['priority'])) $entry->priority = $validated['priority'];
        if (isset($validated['status']))   $entry->status   = $validated['status'];

        $entry->save();
        $entry->load('patient');

        return response()->json([
            'success' => true,
            'message' => 'Entry updated.',
            'data'    => $entry->toApiArray(),
        ]);
    }

    // ── POST /receptionist/waitlist/{id}/call ─────────────────
    public function call(int $id): JsonResponse
    {
        $entry = WaitlistEntry::where('id', $id)
            ->where('clinic_id', $this->clinicId())
            ->where('branch_id', $this->branchId())
            ->firstOrFail();

        $nextStatus = $entry->status === 'waiting' ? 'called' : 'in_service';

        $entry->update(['status' => $nextStatus]);

        return response()->json([
            'success' => true,
            'message' => "{$entry->name} " . ($nextStatus === 'called' ? 'called.' : 'now in service.'),
            'data'    => $entry->fresh('patient')->toApiArray(),
        ]);
    }

    // ── DELETE /receptionist/waitlist/{id} ────────────────────
    public function destroy(int $id): JsonResponse
    {
        $entry = WaitlistEntry::where('id', $id)
            ->where('clinic_id', $this->clinicId())
            ->where('branch_id', $this->branchId())
            ->firstOrFail();

        $entry->update(['status' => 'removed']);

        return response()->json([
            'success' => true,
            'message' => 'Removed from waitlist.',
        ]);
    }
}
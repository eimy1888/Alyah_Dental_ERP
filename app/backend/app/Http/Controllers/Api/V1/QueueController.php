<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\QueueItem;
use App\Models\Appointment;
use App\Models\User;

class QueueController extends Controller
{
    /**
     * Get the live queue for a branch (receptionist/manager view).
     *
     * GET /api/v1/receptionist/queue
     * GET /api/v1/manager/queue
     */
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $queue = QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'dentist', 'appointment'])
            ->ordered()
            ->get()
            ->map(fn($item) => $this->formatQueueItem($item));

        return response()->json([
            'success' => true,
            'data'    => [
                'queue'       => $queue,
                'total'       => $queue->count(),
                'waiting'     => $queue->where('status', 'waiting')->count(),
                'in_progress' => $queue->where('status', 'in_progress')->count(),
            ],
        ]);
    }

    /**
     * Get dentist's personal queue.
     *
     * GET /api/v1/dentist/queue
     */
    public function dentistQueue(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $queue = QueueItem::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->forDentist($dentist->id)
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'appointment'])
            ->ordered()
            ->get()
            ->map(fn($item) => $this->formatQueueItem($item));

        return response()->json([
            'success' => true,
            'data'    => [
                'queue'       => $queue,
                'total'       => $queue->count(),
                'waiting'     => $queue->where('status', 'waiting')->count(),
                'in_progress' => $queue->where('status', 'in_progress')->count(),
                'next_patient' => $queue->where('status', 'waiting')->first() ?: null,
            ],
        ]);
    }

    /**
     * Dentist calls next patient.
     *
     * POST /api/v1/dentist/queue/call-next
     */
    public function callNext(Request $request): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        // Find dentist's current in-progress item (should be at most one)
        $current = QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentist->id)
            ->where('status', 'in_progress')
            ->first();

        // Complete current if exists
        if ($current) {
            $current->update([
                'status'       => 'completed',
                'completed_at' => now(),
            ]);

            // Also update linked appointment
            if ($current->appointment_id) {
                Appointment::find($current->appointment_id)?->update([
                    'status'   => 'completed',
                    'end_time' => now(),
                ]);
            }
        }

        // Find next waiting patient for this dentist
        $next = QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($dentist->id)
            ->where('status', 'waiting')
            ->ordered()
            ->first();

        if (!$next) {
            return response()->json([
                'success' => true,
                'message' => 'No patients waiting.',
                'data'    => ['next_patient' => null],
            ]);
        }

        // Mark as in-progress
        $next->update([
            'status'     => 'in_progress',
            'called_at'  => now(),
            'started_at' => now(),
        ]);

        // Update linked appointment
        if ($next->appointment_id) {
            Appointment::find($next->appointment_id)?->update([
                'status'     => 'in_progress',
                'start_time' => now(),
            ]);
        }

        $next->load(['patient', 'appointment']);

        return response()->json([
            'success' => true,
            'message' => "Calling {$next->patient->full_name}.",
            'data'    => $this->formatQueueItem($next),
        ]);
    }

    /**
     * Manager emergency override — insert patient at top of queue.
     *
     * POST /api/v1/manager/queue/emergency-override
     * Body: { patient_id, dentist_id, reason }
     */
    public function emergencyOverride(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'dentist_id' => 'required|exists:users,id',
            'reason'     => 'nullable|string|max:500',
        ]);

        // Create emergency queue item at position 0
        $queueItem = QueueItem::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $branchId,
            'appointment_id' => null,
            'patient_id'     => $request->patient_id,
            'dentist_id'     => $request->dentist_id,
            'priority'       => 'emergency',
            'position'       => 0,
            'status'         => 'waiting',
            'notes'          => 'EMERGENCY OVERRIDE by manager: ' . ($request->reason ?? 'No reason given'),
        ]);

        // Reorder remaining queue items
        $this->reorderQueue($clinicId, $branchId, $request->dentist_id);

        $queueItem->load(['patient', 'dentist']);

        return response()->json([
            'success' => true,
            'message' => 'Emergency patient inserted at top of queue.',
            'data'    => $this->formatQueueItem($queueItem),
        ]);
    }

    /**
     * Remove a patient from the queue.
     *
     * DELETE /api/v1/receptionist/queue/{id}
     * DELETE /api/v1/manager/queue/{id}
     */
    public function remove(Request $request, int $id): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $queueItem = QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->findOrFail($id);

        $queueItem->update([
            'status'       => 'removed',
            'completed_at' => now(),
        ]);

        $this->reorderQueue($clinicId, $branchId, $queueItem->dentist_id);

        return response()->json([
            'success' => true,
            'message' => 'Patient removed from queue.',
        ]);
    }

    // ── HELPERS ────────────────────────────────────────────

    private function reorderQueue(int $clinicId, int $branchId, ?int $dentistId = null): void
    {
        $query = QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('status', 'waiting');

        if ($dentistId) {
            $query->forDentist($dentistId);
        }

        $items = $query->ordered()->get();

        $position = 1;
        foreach ($items as $item) {
            if ($item->priority === 'emergency') {
                $item->update(['position' => 0]);
            } else {
                $item->update(['position' => $position++]);
            }
        }
    }

    private function formatQueueItem(QueueItem $item): array
    {
        $waitMinutes = $item->created_at
            ? (int) now()->diffInMinutes($item->created_at)
            : 0;

        return [
            'id'                => $item->id,
            'position'          => $item->position,
            'priority'          => $item->priority,
            'status'            => $item->status,
            'patient_id'        => $item->patient_id,
            'patient_name'      => $item->patient?->full_name ?? '—',
            'patient_phone'     => $item->patient?->phone ?? '—',
            'dentist_id'        => $item->dentist_id,
            'dentist_name'      => $item->dentist?->name ?? '—',
            'appointment_id'    => $item->appointment_id,
            'appointment_type'  => $item->appointment?->type ?? null,
            'wait_minutes'      => $waitMinutes,
            'notes'             => $item->notes,
            'called_at'         => $item->called_at?->toDateTimeString(),
            'created_at'        => $item->created_at->toDateTimeString(),
        ];
    }
}
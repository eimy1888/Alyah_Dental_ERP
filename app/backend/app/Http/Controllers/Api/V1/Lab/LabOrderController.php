<?php

namespace App\Http\Controllers\Api\V1\Lab;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\LabOrder;
use App\Models\Appointment;
use Carbon\Carbon;

class LabOrderController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/lab/orders
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $query = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->with(['patient', 'orderingDentist', 'appointment']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }

        $orders = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $orders->map(fn($o) => $this->formatOrder($o)),
            'meta'    => [
                'total'        => $orders->total(),
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'per_page'     => $orders->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/lab/orders/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $order = LabOrder::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->with(['patient', 'orderingDentist', 'fittingSpecialist', 'appointment', 'fittingAppointment', 'treatmentPlan'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $this->formatOrderDetail($order),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/v1/lab/orders/{id}/status
    // ─────────────────────────────────────────────────────────────────────────
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $order = LabOrder::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        $request->validate([
            'status' => 'required|in:pending,sent_to_lab,in_progress,ready,delivered,cancelled',
            'notes'  => 'nullable|string',
        ]);

        $newStatus = $request->status;

        $updateData = ['status' => $newStatus];

        if ($request->filled('notes')) {
            $existing = $order->notes ?? '';
            $timestamp = Carbon::now()->format('d M Y H:i');
            $updateData['notes'] = $existing
                ? $existing . "\n[{$timestamp}] " . $request->notes
                : "[{$timestamp}] " . $request->notes;
        }

        // When status = ready: set actual_ready_date and notify dentist
        if ($newStatus === LabOrder::STATUS_READY) {
            $updateData['actual_ready_date'] = Carbon::now()->toDateString();

            // Auto-create fitting appointment if fitting_specialist_id set and no fitting_appointment yet
            if ($order->fitting_specialist_id && !$order->fitting_appointment_id) {
                $fittingAppt = $this->createFittingAppointment($order, $user);
                if ($fittingAppt) {
                    $updateData['fitting_appointment_id'] = $fittingAppt->id;
                }
            }

            $order->update($updateData);
            $order->refresh();

            // Notify ordering dentist + fitting specialist
            \App\Services\NotificationService::labOrderReady($order);

            return response()->json([
                'success' => true,
                'message' => 'Status updated successfully.',
                'data'    => $this->formatOrder($order),
            ]);
        }

        $order->update($updateData);
        $order->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully.',
            'data'    => $this->formatOrder($order),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/lab/orders/{id}/notes
    // ─────────────────────────────────────────────────────────────────────────
    public function addNote(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $order = LabOrder::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        $request->validate(['note' => 'required|string|max:1000']);

        $existing  = $order->notes ?? '';
        $timestamp = Carbon::now()->format('d M Y H:i');
        $newNotes  = $existing
            ? $existing . "\n[{$timestamp}] " . $request->note
            : "[{$timestamp}] " . $request->note;

        $order->update(['notes' => $newNotes]);

        return response()->json([
            'success' => true,
            'message' => 'Note added.',
            'data'    => ['notes' => $newNotes],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function createFittingAppointment(LabOrder $order, $user): ?Appointment
    {
        try {
            // Find next available weekday slot (09:00) for the specialist
            $date = Carbon::tomorrow();
            $attempts = 0;
            while ($date->isWeekend() && $attempts < 10) {
                $date->addDay();
                $attempts++;
            }

            $appointmentTime = $date->setTime(9, 0, 0);

            return Appointment::create([
                'clinic_id'        => $order->clinic_id,
                'branch_id'        => $order->branch_id,
                'patient_id'       => $order->patient_id,
                'dentist_id'       => $order->fitting_specialist_id,
                'appointment_time' => $appointmentTime,
                'duration_minutes' => 60,
                'type'             => 'Fitting - ' . ucfirst($order->order_type),
                'status'           => Appointment::STATUS_CONFIRMED,
                'notes'            => "Auto-scheduled fitting for Lab Order: {$order->lab_order_number}",
                'created_by'       => $user->id,
                'billing_model'    => Appointment::BILLING_SERVICE,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Failed to create fitting appointment: ' . $e->getMessage());
            return null;
        }
    }

    private function formatOrder(LabOrder $o): array
    {
        return [
            'id'                  => $o->id,
            'lab_order_number'    => $o->lab_order_number,
            'order_type'          => $o->order_type,
            'material'            => $o->material,
            'tooth_numbers'       => $o->tooth_numbers,
            'instructions'        => $o->instructions,
            'status'              => $o->status,
            'expected_ready_date' => $o->expected_ready_date?->toDateString(),
            'actual_ready_date'   => $o->actual_ready_date?->toDateString(),
            'notes'               => $o->notes,
            'patient_name'        => $o->patient?->full_name ?? '—',
            'patient_id'          => $o->patient_id,
            'ordering_dentist'    => $o->orderingDentist?->name ?? '—',
            'ordering_dentist_id' => $o->ordering_dentist_id,
            'fitting_specialist'  => $o->fittingSpecialist?->name ?? null,
            'fitting_appointment_id' => $o->fitting_appointment_id,
            'created_at'          => $o->created_at?->toDateTimeString(),
        ];
    }

    private function formatOrderDetail(LabOrder $o): array
    {
        $base = $this->formatOrder($o);
        $base['appointment'] = $o->appointment ? [
            'id'               => $o->appointment->id,
            'appointment_time' => $o->appointment->appointment_time?->toDateTimeString(),
            'type'             => $o->appointment->type,
        ] : null;
        $base['fitting_appointment'] = $o->fittingAppointment ? [
            'id'               => $o->fittingAppointment->id,
            'appointment_time' => $o->fittingAppointment->appointment_time?->toDateTimeString(),
        ] : null;
        $base['treatment_plan'] = $o->treatmentPlan ? [
            'id'     => $o->treatmentPlan->id,
            'title'  => $o->treatmentPlan->title,
            'status' => $o->treatmentPlan->status,
        ] : null;
        return $base;
    }
}

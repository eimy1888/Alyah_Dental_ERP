<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\LabOrder;
use App\Models\Appointment;

class LabOrderController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/dentist/lab-orders
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $orders = LabOrder::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('ordering_dentist_id', $dentist->id)
            ->with(['patient', 'appointment', 'fittingSpecialist'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($o) => $this->formatOrder($o));

        return response()->json([
            'success' => true,
            'data'    => $orders,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/dentist/lab-orders
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $validated = $request->validate([
            'appointment_id'       => 'required|exists:appointments,id',
            'order_type'           => 'required|in:crown,bridge,denture,aligner,veneer,implant_crown,diagnostic,other',
            'material'             => 'nullable|string|max:100',
            'tooth_numbers'        => 'nullable|array',
            'tooth_numbers.*'      => 'string|max:10',
            'instructions'         => 'nullable|string',
            'expected_ready_date'  => 'nullable|date|after_or_equal:today',
            'fitting_specialist_id'=> 'nullable|exists:users,id',
            'treatment_plan_id'    => 'nullable|exists:treatment_plans,id',
            'notes'                => 'nullable|string',
        ]);

        // Ensure the appointment belongs to this dentist's clinic
        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->findOrFail($validated['appointment_id']);

        $labOrderNumber = LabOrder::generateNumber($dentist->clinic_id);

        $order = LabOrder::create([
            'clinic_id'             => $dentist->clinic_id,
            'branch_id'             => $dentist->branch_id,
            'patient_id'            => $appointment->patient_id,
            'treatment_plan_id'     => $validated['treatment_plan_id'] ?? null,
            'appointment_id'        => $appointment->id,
            'ordering_dentist_id'   => $dentist->id,
            'fitting_specialist_id' => $validated['fitting_specialist_id'] ?? null,
            'lab_order_number'      => $labOrderNumber,
            'order_type'            => $validated['order_type'],
            'material'              => $validated['material'] ?? null,
            'tooth_numbers'         => $validated['tooth_numbers'] ?? null,
            'instructions'          => $validated['instructions'] ?? null,
            'status'                => LabOrder::STATUS_PENDING,
            'expected_ready_date'   => $validated['expected_ready_date'] ?? null,
            'notes'                 => $validated['notes'] ?? null,
        ]);

        $order->load(['patient', 'appointment', 'fittingSpecialist']);

        return response()->json([
            'success' => true,
            'message' => "Lab order {$labOrderNumber} created successfully.",
            'data'    => $this->formatOrder($order),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/dentist/lab-orders/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $order = LabOrder::forClinic($dentist->clinic_id)
            ->where('ordering_dentist_id', $dentist->id)
            ->with(['patient', 'appointment', 'fittingSpecialist', 'treatmentPlan', 'fittingAppointment'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $this->formatOrder($order, detail: true),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/v1/dentist/lab-orders/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $order = LabOrder::forClinic($dentist->clinic_id)
            ->where('ordering_dentist_id', $dentist->id)
            ->findOrFail($id);

        if ($order->status !== LabOrder::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending lab orders can be deleted.',
            ], 422);
        }

        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lab order deleted successfully.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helper
    // ─────────────────────────────────────────────────────────────────────────

    private function formatOrder(LabOrder $o, bool $detail = false): array
    {
        $data = [
            'id'                   => $o->id,
            'lab_order_number'     => $o->lab_order_number,
            'order_type'           => $o->order_type,
            'material'             => $o->material,
            'tooth_numbers'        => $o->tooth_numbers,
            'instructions'         => $o->instructions,
            'status'               => $o->status,
            'expected_ready_date'  => $o->expected_ready_date?->toDateString(),
            'actual_ready_date'    => $o->actual_ready_date?->toDateString(),
            'notes'                => $o->notes,
            'patient_name'         => $o->patient?->full_name ?? '—',
            'patient_id'           => $o->patient_id,
            'fitting_specialist'   => $o->fittingSpecialist?->name ?? null,
            'fitting_specialist_id'=> $o->fitting_specialist_id,
            'fitting_appointment_id' => $o->fitting_appointment_id,
            'appointment'          => $o->appointment ? [
                'id'               => $o->appointment->id,
                'appointment_time' => $o->appointment->appointment_time?->toDateTimeString(),
                'type'             => $o->appointment->type,
            ] : null,
            'created_at'           => $o->created_at?->toDateTimeString(),
        ];

        if ($detail) {
            $data['treatment_plan'] = $o->treatmentPlan ? [
                'id'    => $o->treatmentPlan->id,
                'title' => $o->treatmentPlan->title,
            ] : null;
            $data['fitting_appointment'] = $o->fittingAppointment ? [
                'id'               => $o->fittingAppointment->id,
                'appointment_time' => $o->fittingAppointment->appointment_time?->toDateTimeString(),
            ] : null;
        }

        return $data;
    }
}

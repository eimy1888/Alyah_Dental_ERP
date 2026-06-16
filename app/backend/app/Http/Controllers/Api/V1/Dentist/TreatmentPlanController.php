<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Services\SpecialistAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * TreatmentPlanController
 *
 * REQ-5: CHECKUP COMPLETE action — auto-generates the single Treatment_Invoice (UNPAID).
 * REQ-2: One invoice per plan. No estimates, no deposits, no approval stage.
 * REQ-3: Invoice starts UNPAID. Patient must pay 100% before treatment activates.
 * REQ-4: Emergency cases skip payment gate.
 * REQ-6/7: Specialist determined at checkup; appointment auto-booked after payment.
 * REQ-9: Lab fee included in same invoice; lab order auto-created after payment.
 * REQ-14: Auto-recall on treatment complete.
 */
class TreatmentPlanController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // LIST  GET /dentist/treatment-plans
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $query = TreatmentPlan::forClinic($dentist->clinic_id)
            ->forBranch($dentist->branch_id)
            ->where('gp_id', $dentist->id)
            ->with(['patient:id,first_name,last_name', 'invoice'])
            ->latest();

        if ($request->filled('status'))     $query->where('status', $request->status);
        if ($request->filled('patient_id')) $query->where('patient_id', $request->patient_id);

        $plans = $query->paginate((int) ($request->per_page ?? 20));

        return response()->json([
            'success' => true,
            'data'    => $plans->through(fn($p) => $this->formatPlan($p)),
            'meta'    => [
                'total'        => $plans->total(),
                'current_page' => $plans->currentPage(),
                'last_page'    => $plans->lastPage(),
                'per_page'     => $plans->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW  GET /dentist/treatment-plans/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $plan = TreatmentPlan::forClinic($dentist->clinic_id)
            ->where('gp_id', $dentist->id)
            ->with(['patient', 'invoice.items', 'labOrders'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->formatPlan($plan, true)]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECKUP COMPLETE  POST /dentist/treatment-plans
    // REQ-5: Generates the single UNPAID Treatment_Invoice.
    // Called when doctor clicks "CHECKUP COMPLETE" on an appointment.
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $validated = $request->validate([
            'appointment_id'         => 'required|exists:appointments,id',
            'title'                  => 'required|string|max:255',
            'diagnosis'              => 'required|string|max:5000',
            'notes'                  => 'nullable|string|max:2000',
            // Procedures performed / planned during checkup
            'procedure_service_ids'  => 'nullable|array',
            'procedure_service_ids.*'=> 'integer|exists:services,id',
            // Sessions
            'total_sessions_planned' => 'nullable|integer|min:1|max:50',
            // Lab
            'requires_lab'           => 'nullable|boolean',
            'lab_order_type'         => 'nullable|string|in:crown,bridge,denture,aligner,veneer,implant_crown,other',
            'lab_material'           => 'nullable|string|max:100',
            // Specialist
            'requires_specialist'    => 'nullable|boolean',
            'specialist_type'        => 'nullable|string|max:100',
        ]);

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($validated['appointment_id']);

        if (!in_array($appointment->status, ['in_progress', 'checked_in', 'treatment_started'])) {
            return response()->json([
                'success' => false,
                'message' => 'CHECKUP COMPLETE can only be triggered for in-progress appointments.',
                'code'    => 'INVALID_APPOINTMENT_STATUS',
            ], 422);
        }

        // REQ-5: Idempotent — return existing plan if already created
        $existing = TreatmentPlan::where('initial_appointment_id', $appointment->id)
            ->whereNotIn('status', ['cancelled'])
            ->with(['invoice'])
            ->first();

        if ($existing) {
            return response()->json([
                'success'    => true,
                'message'    => 'Treatment plan already exists for this appointment.',
                'data'       => $this->formatPlan($existing, true),
                'is_existing'=> true,
            ]);
        }

        DB::beginTransaction();
        try {
            $clinicId = $dentist->clinic_id;
            $taxRate  = (float) ($appointment->clinic?->getSetting('tax_rate', 15) ?? 15);

            // Auto-detect specialist if not explicitly provided
            $requiresSpecialist = (bool) ($validated['requires_specialist'] ?? false);
            $specialistType     = $validated['specialist_type'] ?? null;

            if (!$requiresSpecialist && !empty($validated['procedure_service_ids'])) {
                $svcNames = Service::whereIn('id', $validated['procedure_service_ids'])
                    ->pluck('name')->toArray();
                $detectedType = SpecialistAssignmentService::determineSpecialistType(
                    $validated['diagnosis'],
                    $svcNames
                );
                if ($detectedType) {
                    $requiresSpecialist = true;
                    $specialistType     = $detectedType;
                }
            }

            // Create treatment plan
            $plan = TreatmentPlan::create([
                'clinic_id'              => $clinicId,
                'branch_id'              => $dentist->branch_id,
                'patient_id'             => $appointment->patient_id,
                'gp_id'                  => $dentist->id,
                'initial_appointment_id' => $appointment->id,
                'title'                  => $validated['title'],
                'diagnosis'              => $validated['diagnosis'],
                'notes'                  => $validated['notes'] ?? null,
                'status'                 => TreatmentPlan::STATUS_ACTIVE,
                'requires_lab'           => (bool) ($validated['requires_lab'] ?? false),
                'lab_order_type'         => $validated['lab_order_type'] ?? null,
                'lab_material'           => $validated['lab_material'] ?? null,
                'requires_specialist'    => $requiresSpecialist,
                'specialist_type'        => $specialistType,
                'total_sessions_planned' => (int) ($validated['total_sessions_planned'] ?? 1),
                'total_sessions_done'    => 0,
                'started_at'             => now(),
            ]);

            $appointment->update(['treatment_plan_id' => $plan->id]);

            // ── Build the single UNPAID Treatment_Invoice ─────────────────────
            $invoice = Invoice::create([
                'clinic_id'        => $clinicId,
                'branch_id'        => $dentist->branch_id,
                'patient_id'       => $appointment->patient_id,
                'appointment_id'   => $appointment->id,
                'created_by'       => $dentist->id,
                'invoice_number'   => Invoice::generateNumber($clinicId),
                'invoice_type'     => Invoice::TYPE_TREATMENT,
                'lifecycle_status' => Invoice::STATUS_UNPAID,
                'total'            => 0,
                'estimated_total'  => 0,
                'tax_rate'         => $taxRate,
                'tax_amount'       => 0,
                'paid'             => 0,
                'pre_paid'         => 0,
                'balance'          => 0,
                'status'           => 'sent',
                'issued_at'        => now(),
                'due_date'         => now()->addDays(7),
                'notes'            => "Treatment: {$plan->title}" .
                    ($appointment->is_emergency_bypass ? ' [EMERGENCY]' : ''),
            ]);

            // Add procedure line items
            $serviceIds = $validated['procedure_service_ids'] ?? [];
            $subtotal   = 0;

            if (!empty($serviceIds)) {
                $services = Service::where('clinic_id', $clinicId)
                    ->whereIn('id', $serviceIds)->get()->keyBy('id');

                foreach ($serviceIds as $svcId) {
                    $svc = $services[$svcId] ?? null;
                    if (!$svc) continue;
                    $price    = (float) $svc->price;
                    $subtotal += $price;

                    InvoiceItem::create([
                        'invoice_id'  => $invoice->id,
                        'description' => $svc->name,
                        'quantity'    => 1,
                        'unit_price'  => $price,
                        'item_type'   => InvoiceItem::TYPE_PROCEDURE,
                        'source_type' => Service::class,
                        'source_id'   => $svc->id,
                        'added_by'    => $dentist->id,
                        'is_locked'   => false,
                    ]);
                }
            }

            // REQ-9: Lab fee included in main invoice (varies by type)
            if ($plan->requires_lab) {
                $labFees = [
                    'crown'        => 500,
                    'bridge'       => 500,
                    'denture'      => 800,
                    'aligner'      => 1200,
                    'implant_crown'=> 700,
                    'veneer'       => 600,
                    'other'        => 500,
                ];
                $labFee   = (float) ($labFees[$plan->lab_order_type] ?? 500);
                $subtotal += $labFee;

                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'description' => 'Fabrication Lab — ' . ucfirst($plan->lab_order_type ?? 'Other'),
                    'quantity'    => 1,
                    'unit_price'  => $labFee,
                    'item_type'   => 'lab_fee',
                    'added_by'    => $dentist->id,
                    'is_locked'   => false,
                ]);
            }

            // Calculate and save totals
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $total     = $subtotal + $taxAmount;

            $invoice->update([
                'total'           => $total,
                'estimated_total' => $total,
                'tax_amount'      => $taxAmount,
                'balance'         => $total,
            ]);

            // Link invoice to plan
            $plan->update([
                'invoice_id'         => $invoice->id,
                'estimate_invoice_id'=> $invoice->id, // backward compat
            ]);
            $appointment->update(['treatment_invoice_id' => $invoice->id]);

            // REQ-4: Emergency — invoice is UNPAID but treatment is already in progress
            // Set lifecycle to UNPAID — receptionist collects payment before discharge
            if ($appointment->is_emergency_bypass) {
                $invoice->update(['notes' => $invoice->notes . ' | Emergency — payment required before discharge']);
            }

            // Clinical note
            ClinicalNote::create([
                'clinic_id'      => $clinicId,
                'branch_id'      => $dentist->branch_id,
                'patient_id'     => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'dentist_id'     => $dentist->id,
                'note_type'      => 'Treatment Plan',
                'content'        => "CHECKUP COMPLETE\n\nDiagnosis: {$plan->diagnosis}"
                    . ($requiresSpecialist ? "\nReferral: {$specialistType}" : '')
                    . ($plan->requires_lab ? "\nLab: " . ucfirst($plan->lab_order_type ?? 'required') : '')
                    . "\nInvoice: {$invoice->invoice_number} — ETB " . number_format($total, 2) . " (UNPAID)",
                'is_signed' => true,
                'signed_at' => now(),
            ]);

            // Notify accountant + patient
            $this->notifyCheckupComplete($plan, $invoice, $dentist, $appointment);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        $plan->load(['patient', 'invoice.items']);

        return response()->json([
            'success' => true,
            'message' => 'Checkup complete. Invoice generated — patient must pay ETB ' .
                number_format($total ?? 0, 2) . ' before treatment starts.',
            'data'    => $this->formatPlan($plan, true),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE  PUT /dentist/treatment-plans/{id}
    // Only allows editing while plan is active and invoice is UNPAID.
    // ─────────────────────────────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $plan = TreatmentPlan::forClinic($dentist->clinic_id)
            ->where('gp_id', $dentist->id)
            ->with('invoice')
            ->findOrFail($id);

        if (!$plan->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => "Plan is {$plan->status} and cannot be edited.",
            ], 422);
        }

        $invoice = $plan->getEffectiveInvoice();
        if ($invoice && $invoice->lifecycle_status !== Invoice::STATUS_UNPAID) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is immutable after payment. Cannot update plan.',
                'code'    => 'INVOICE_IMMUTABLE',
            ], 422);
        }

        $validated = $request->validate([
            'title'                  => 'nullable|string|max:255',
            'diagnosis'              => 'nullable|string|max:5000',
            'notes'                  => 'nullable|string|max:2000',
            'total_sessions_planned' => 'nullable|integer|min:1|max:50',
            'requires_specialist'    => 'nullable|boolean',
            'specialist_type'        => 'nullable|string|max:100',
        ]);

        $plan->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json([
            'success' => true,
            'message' => 'Treatment plan updated.',
            'data'    => $this->formatPlan($plan->fresh()),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMPLETE  POST /dentist/treatment-plans/{id}/complete
    // REQ-16: Marks plan done → auto-schedules recall.
    // ─────────────────────────────────────────────────────────────────────────
    public function complete(Request $request, int $id): JsonResponse
    {
        $dentist = $request->user();

        $plan = TreatmentPlan::forClinic($dentist->clinic_id)
            ->where('gp_id', $dentist->id)
            ->with(['invoice', 'initialAppointment'])
            ->findOrFail($id);

        if ($plan->status === TreatmentPlan::STATUS_COMPLETED) {
            return response()->json(['success' => false, 'message' => 'Plan already completed.'], 422);
        }

        // REQ-3: Cannot complete if invoice is still unpaid (non-emergency)
        $invoice      = $plan->getEffectiveInvoice();
        $isEmergency  = $plan->initialAppointment?->is_emergency_bypass ?? false;

        if (!$isEmergency && $invoice && $invoice->lifecycle_status === Invoice::STATUS_UNPAID) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot complete treatment — invoice is still UNPAID. Collect payment first.',
                'code'    => 'INVOICE_UNPAID',
                'balance' => (float) $invoice->balance,
            ], 422);
        }

        DB::beginTransaction();
        try {
            $plan->update([
                'status'       => TreatmentPlan::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            // Close appointment
            $appt = $plan->initialAppointment;
            if ($appt && !in_array($appt->status, ['completed', 'cancelled'])) {
                $appt->update(['status' => 'completed', 'end_time' => now()]);
                \App\Models\QueueItem::where('appointment_id', $appt->id)
                    ->update(['status' => 'completed', 'completed_at' => now()]);
            }

            // REQ-16: Auto-schedule recall by treatment type
            $this->scheduleRecall($plan);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Treatment completed. Recall appointment scheduled automatically.',
            'data'    => $this->formatPlan($plan->fresh(), true),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER DIAGNOSTIC TEST  POST /dentist/treatment-plans/diagnostic-test
    // REQ-11: Immediate on-the-spot billing, separate from treatment invoice.
    // ─────────────────────────────────────────────────────────────────────────
    public function orderDiagnosticTest(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $validated = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'service_id'     => 'required|exists:services,id',
            'notes'          => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($validated['appointment_id']);

        $service = Service::where('clinic_id', $dentist->clinic_id)
            ->where('is_diagnostic', true)
            ->findOrFail($validated['service_id']);

        // Get or create UNPAID diagnostic invoice for this appointment
        $diagInvoice = Invoice::where('clinic_id', $dentist->clinic_id)
            ->where('appointment_id', $appointment->id)
            ->where('invoice_type', Invoice::TYPE_DIAGNOSTIC)
            ->whereNotIn('lifecycle_status', [Invoice::STATUS_LOCKED])
            ->first();

        if (!$diagInvoice) {
            $taxRate     = (float) ($appointment->clinic?->getSetting('tax_rate', 15) ?? 15);
            $diagInvoice = Invoice::create([
                'clinic_id'        => $dentist->clinic_id,
                'branch_id'        => $dentist->branch_id,
                'patient_id'       => $appointment->patient_id,
                'appointment_id'   => $appointment->id,
                'created_by'       => $dentist->id,
                'invoice_number'   => 'DIAG-' . date('Y') . '-' . str_pad(
                    Invoice::where('clinic_id', $dentist->clinic_id)->where('invoice_type', 'diagnostic')->count() + 1,
                    4, '0', STR_PAD_LEFT
                ),
                'invoice_type'     => Invoice::TYPE_DIAGNOSTIC,
                'lifecycle_status' => Invoice::STATUS_UNPAID,
                'total'            => 0,
                'estimated_total'  => 0,
                'tax_rate'         => $taxRate,
                'tax_amount'       => 0,
                'paid'             => 0,
                'pre_paid'         => 0,
                'balance'          => 0,
                'status'           => 'sent',
                'issued_at'        => now(),
                'due_date'         => now()->addDays(1),
                'notes'            => 'Diagnostic tests — immediate payment required',
            ]);
            $appointment->update(['service_invoice_id' => $diagInvoice->id]);
        }

        DB::beginTransaction();
        try {
            $price = (float) $service->price;

            InvoiceItem::create([
                'invoice_id'  => $diagInvoice->id,
                'description' => $service->name,
                'quantity'    => 1,
                'unit_price'  => $price,
                'item_type'   => InvoiceItem::TYPE_SERVICE,
                'source_type' => Service::class,
                'source_id'   => $service->id,
                'added_by'    => $dentist->id,
                'is_locked'   => false,
            ]);

            $diagInvoice->recalculate();

            ClinicalNote::create([
                'clinic_id'      => $dentist->clinic_id,
                'branch_id'      => $dentist->branch_id,
                'patient_id'     => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'dentist_id'     => $dentist->id,
                'note_type'      => 'lab_result',
                'content'        => "Diagnostic ordered: {$service->name}" .
                    ($validated['notes'] ? " — {$validated['notes']}" : '') .
                    " — ETB " . number_format($price, 2) . " (UNPAID)",
                'is_signed' => true,
                'signed_at' => now(),
            ]);

            // Notify accountant to collect immediately
            \App\Models\User::where('clinic_id', $dentist->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->each(function ($accountant) use ($service, $price, $appointment, $diagInvoice) {
                    \DB::table('notifications')->insert([
                        'id'              => \Illuminate\Support\Str::uuid(),
                        'type'            => 'diagnostic_invoice',
                        'notifiable_type' => \App\Models\User::class,
                        'notifiable_id'   => $accountant->id,
                        'data'            => json_encode([
                            'title'   => 'Diagnostic Test — Collect Payment Now',
                            'message' => "Dr. ordered {$service->name} for {$appointment->patient?->full_name}. ETB " .
                                number_format($price, 2) . " — Invoice {$diagInvoice->invoice_number}",
                            'invoice_id' => $diagInvoice->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "{$service->name} ordered. Accountant notified to collect ETB " . number_format($price, 2) . " immediately.",
            'data'    => [
                'service_name'    => $service->name,
                'price'           => $price,
                'invoice_id'      => $diagInvoice->id,
                'invoice_number'  => $diagInvoice->invoice_number,
                'invoice_total'   => (float) $diagInvoice->fresh()->total,
                'invoice_balance' => (float) $diagInvoice->fresh()->balance,
            ],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DIAGNOSTIC SERVICES  GET /dentist/treatment-plans/diagnostic-services
    // ─────────────────────────────────────────────────────────────────────────
    public function diagnosticServices(Request $request): JsonResponse
    {
        $dentist  = $request->user();
        $services = Service::where('clinic_id', $dentist->clinic_id)
            ->where('is_diagnostic', true)
            ->where('is_published', true)
            ->ordered()
            ->get(['id', 'name', 'description', 'price', 'duration_minutes', 'category']);

        return response()->json(['success' => true, 'data' => $services]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function notifyCheckupComplete(
        TreatmentPlan $plan,
        Invoice $invoice,
        User $dentist,
        Appointment $appointment
    ): void {
        try {
            $total       = number_format((float) $invoice->total, 2);
            $patientName = $plan->patient?->full_name ?? 'Patient';

            // Notify accountants
            \App\Models\User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'accountant')->where('is_active', true)
                ->each(function ($acc) use ($invoice, $patientName, $total) {
                    \DB::table('notifications')->insert([
                        'id'              => \Illuminate\Support\Str::uuid(),
                        'type'            => 'invoice_ready_for_payment',
                        'notifiable_type' => \App\Models\User::class,
                        'notifiable_id'   => $acc->id,
                        'data'            => json_encode([
                            'title'   => 'Invoice Ready — Collect Payment',
                            'message' => "Invoice {$invoice->invoice_number} for {$patientName}. Total: ETB {$total}. Collect now.",
                            'invoice_id' => $invoice->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            // Notify receptionists
            \App\Models\User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'receptionist')->where('is_active', true)
                ->each(function ($rec) use ($invoice, $patientName, $total) {
                    \DB::table('notifications')->insert([
                        'id'              => \Illuminate\Support\Str::uuid(),
                        'type'            => 'invoice_ready_for_payment',
                        'notifiable_type' => \App\Models\User::class,
                        'notifiable_id'   => $rec->id,
                        'data'            => json_encode([
                            'title'   => 'PAYMENT REQUIRED — ETB ' . $total,
                            'message' => "{$patientName} — Invoice {$invoice->invoice_number} — ETB {$total}",
                            'invoice_id' => $invoice->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            // Notify patient
            $patientUser = \App\Models\User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'patient')
                ->where(function ($q) use ($plan) {
                    if ($plan->patient?->email) $q->orWhere('email', $plan->patient->email);
                    if ($plan->patient?->phone) $q->orWhere('phone', $plan->patient->phone);
                })->first();

            if ($patientUser) {
                \DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'treatment_plan_ready',
                    'notifiable_type' => \App\Models\User::class,
                    'notifiable_id'   => $patientUser->id,
                    'data'            => json_encode([
                        'title'   => 'Your treatment plan is ready',
                        'message' => "Total: ETB {$total}. Please proceed to the payment desk.",
                        'invoice_id' => $invoice->id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[TreatmentPlan] notifyCheckupComplete: ' . $e->getMessage());
        }
    }

    /**
     * REQ-16: Auto-schedule recall by treatment type.
     */
    private function scheduleRecall(TreatmentPlan $plan): void
    {
        try {
            $recallIntervals = [
                'cleaning'    => 6,
                'scaling'     => 6,
                'filling'     => 12,
                'root canal'  => 6,
                'crown'       => 6,
                'bridge'      => 6,
                'orthodontic' => 3,
                'braces'      => 3,
                'extraction'  => 3,
                'checkup'     => 12,
                'default'     => 6,
            ];

            $titleLower = strtolower($plan->title . ' ' . $plan->diagnosis);
            $months = $recallIntervals['default'];
            foreach ($recallIntervals as $keyword => $interval) {
                if ($keyword !== 'default' && str_contains($titleLower, $keyword)) {
                    $months = $interval;
                    break;
                }
            }

            $recallDate = now()->addMonths($months);

            \App\Models\Recall::create([
                'clinic_id'      => $plan->clinic_id,
                'branch_id'      => $plan->branch_id,
                'patient_id'     => $plan->patient_id,
                'appointment_id' => $plan->initial_appointment_id,
                'due_date'       => $recallDate,
                'notes'          => "Auto-scheduled recall after: {$plan->title}",
                'status'         => 'scheduled',
            ]);

            // Notify patient
            $patientUser = \App\Models\User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'patient')
                ->where(function ($q) use ($plan) {
                    if ($plan->patient?->email) $q->orWhere('email', $plan->patient->email);
                    if ($plan->patient?->phone) $q->orWhere('phone', $plan->patient->phone);
                })->first();

            if ($patientUser) {
                \DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'recall_scheduled',
                    'notifiable_type' => \App\Models\User::class,
                    'notifiable_id'   => $patientUser->id,
                    'data'            => json_encode([
                        'title'   => 'Your next visit is scheduled',
                        'message' => "Your next checkup is on {$recallDate->format('d M Y')}.",
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[TreatmentPlan] scheduleRecall: ' . $e->getMessage());
        }
    }

    private function formatPlan(TreatmentPlan $plan, bool $detail = false): array
    {
        $invoice = $plan->getEffectiveInvoice();

        $data = [
            'id'                     => $plan->id,
            'title'                  => $plan->title,
            'diagnosis'              => $plan->diagnosis,
            'notes'                  => $plan->notes,
            'status'                 => $plan->status,
            'requires_lab'           => (bool) $plan->requires_lab,
            'lab_order_type'         => $plan->lab_order_type,
            'requires_specialist'    => (bool) $plan->requires_specialist,
            'specialist_type'        => $plan->specialist_type,
            'total_sessions_planned' => (int) $plan->total_sessions_planned,
            'total_sessions_done'    => (int) $plan->total_sessions_done,
            'patient_id'             => $plan->patient_id,
            'patient_name'           => $plan->patient?->full_name ?? '—',
            'gp_id'                  => $plan->gp_id,
            'initial_appointment_id' => $plan->initial_appointment_id,
            'treatment_active'       => $plan->isTreatmentActive(),
            'started_at'             => $plan->started_at?->toDateTimeString(),
            'completed_at'           => $plan->completed_at?->toDateTimeString(),
            'created_at'             => $plan->created_at?->toDateTimeString(),
            'invoice'                => $invoice ? [
                'id'               => $invoice->id,
                'invoice_number'   => $invoice->invoice_number,
                'lifecycle_status' => $invoice->lifecycle_status,
                'total'            => (float) $invoice->total,
                'balance'          => (float) $invoice->balance,
                'is_paid'          => $invoice->lifecycle_status === Invoice::STATUS_PAID,
                'is_unpaid'        => $invoice->lifecycle_status === Invoice::STATUS_UNPAID,
                'payment_banner'   => $invoice->lifecycle_status === Invoice::STATUS_UNPAID
                    ? 'PAYMENT REQUIRED — ETB ' . number_format($invoice->balance, 2)
                    : null,
            ] : null,
        ];

        if ($detail && $plan->labOrders) {
            $data['lab_orders'] = $plan->labOrders->map(fn($lo) => [
                'id'                  => $lo->id,
                'lab_order_number'    => $lo->lab_order_number,
                'order_type'          => $lo->order_type,
                'status'              => $lo->status,
                'expected_ready_date' => $lo->expected_ready_date?->toDateString(),
            ]);
        }

        return $data;
    }
}

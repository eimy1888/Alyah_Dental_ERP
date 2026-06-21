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
            'status'                 => 'nullable|in:draft,proposed,approved,rejected,active,in_progress,pending_lab,completed',
            'estimated_cost'         => 'nullable|numeric|min:0',
            'revision_notes'         => 'nullable|string|max:2000',
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
                'status'                 => $validated['status'] ?? TreatmentPlan::STATUS_PROPOSED,
                'estimated_cost'         => (float) ($validated['estimated_cost'] ?? 0),
                'revision_notes'         => $validated['revision_notes'] ?? null,
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

            // ── Reuse the DRAFT invoice created at booking time ───────────────
            // At booking, BillingModelResolver already created a DRAFT invoice
            // (service or treatment). We find it, add any extra procedures
            // from checkup, then call releaseToAccountant() which promotes
            // it from DRAFT → UNPAID so the accountant can see and collect it.

            // Find existing DRAFT invoice for this appointment
            $invoice = Invoice::where('appointment_id', $appointment->id)
                ->where('lifecycle_status', Invoice::STATUS_DRAFT)
                ->whereIn('invoice_type', [Invoice::TYPE_SERVICE, Invoice::TYPE_TREATMENT, Invoice::TYPE_HYBRID])
                ->first();

            // Fallback: if somehow no draft invoice exists, create one now
            if (!$invoice) {
                $invoice = Invoice::create([
                    'clinic_id'        => $clinicId,
                    'branch_id'        => $dentist->branch_id,
                    'patient_id'       => $appointment->patient_id,
                    'appointment_id'   => $appointment->id,
                    'created_by'       => $dentist->id,
                    'invoice_number'   => Invoice::generateNumber($clinicId),
                    'invoice_type'     => Invoice::TYPE_TREATMENT,
                    'lifecycle_status' => Invoice::STATUS_DRAFT,
                    'total'            => 0,
                    'estimated_total'  => 0,
                    'tax_rate'         => $taxRate,
                    'tax_amount'       => 0,
                    'paid'             => 0,
                    'pre_paid'         => 0,
                    'balance'          => 0,
                    'status'           => 'draft',
                    'issued_at'        => now(),
                    'due_date'         => now()->addDays(7),
                    'notes'            => "Treatment: {$plan->title}",
                ]);
                $appointment->update(['treatment_invoice_id' => $invoice->id]);
            }

            // ── Add any extra procedures selected during checkup ─────────────
            // These are ADDITIONAL to what the dentist may have added via
            // POST /dentist/episodes/{id}/procedures during the session.
            $serviceIds = $validated['procedure_service_ids'] ?? [];

            if (!empty($serviceIds)) {
                $services = Service::where('clinic_id', $clinicId)
                    ->whereIn('id', $serviceIds)->get()->keyBy('id');

                foreach ($serviceIds as $svcId) {
                    $svc = $services[$svcId] ?? null;
                    if (!$svc) continue;

                    // Avoid duplicate: skip if this service item already on invoice
                    $alreadyAdded = $invoice->items()
                        ->where('source_id', $svc->id)
                        ->where('source_type', Service::class)
                        ->exists();
                    if ($alreadyAdded) continue;

                    InvoiceItem::create([
                        'invoice_id'  => $invoice->id,
                        'description' => $svc->name,
                        'quantity'    => 1,
                        'unit_price'  => (float) $svc->price,
                        'item_type'   => InvoiceItem::TYPE_PROCEDURE,
                        'source_type' => Service::class,
                        'source_id'   => $svc->id,
                        'added_by'    => $dentist->id,
                        'is_locked'   => false,
                    ]);
                }
            }

            // ── Add lab fee line if required ──────────────────────────────────
            if ($plan->requires_lab) {
                $labFees = [
                    'crown'        => 500, 'bridge'       => 500,
                    'denture'      => 800, 'aligner'      => 1200,
                    'implant_crown'=> 700, 'veneer'       => 600,
                    'other'        => 500,
                ];
                $labFee = (float) ($labFees[$plan->lab_order_type] ?? 500);

                // Only add if not already there
                $labAlreadyAdded = $invoice->items()
                    ->where('item_type', 'lab_fee')
                    ->exists();

                if (!$labAlreadyAdded) {
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
            }

            // ── RELEASE TO ACCOUNTANT ─────────────────────────────────────────
            // This is the key step: promotes DRAFT → UNPAID.
            // Recalculates totals from ALL items (original service + any added
            // during checkup), then makes the invoice visible to accountant.
            // Emergency bypass: still releases so accountant knows to collect.
            $invoice->releaseToAccountant();
            $invoice->refresh();
            $total = (float) $invoice->total;

            // Link invoice to plan
            $plan->update([
                'invoice_id'          => $invoice->id,
                'estimate_invoice_id' => $invoice->id,
            ]);
            $appointment->update(['treatment_invoice_id' => $invoice->id]);

            // Emergency note
            if ($appointment->is_emergency_bypass) {
                $invoice->update(['notes' => ($invoice->notes ?? '') . ' | Emergency — payment required before discharge']);
            }

            // ── Clinical note (signed, immutable record) ──────────────────────
            ClinicalNote::create([
                'clinic_id'      => $clinicId,
                'branch_id'      => $dentist->branch_id,
                'patient_id'     => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'dentist_id'     => $dentist->id,
                'note_type'      => 'Treatment Plan',
                'content'        => "CHECKUP COMPLETE\n\nDiagnosis: {$plan->diagnosis}"
                    . ($requiresSpecialist ? "\nReferral Required: {$specialistType}" : '')
                    . ($plan->requires_lab ? "\nLab Required: " . ucfirst($plan->lab_order_type ?? 'required') : '')
                    . "\nInvoice: {$invoice->invoice_number} — ETB " . number_format($total, 2) . " (AWAITING PAYMENT)",
                'is_signed' => true,
                'signed_at' => now(),
            ]);

            // ── Notify accountant + receptionist + patient ────────────────────
            \App\Services\NotificationService::treatmentPlanCreated($plan, $appointment, $dentist);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        $plan->load(['patient', 'invoice.items']);

        return response()->json([
            'success' => true,
            'message' => 'Checkup complete. Invoice released — patient must pay ETB ' .
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
        if ($invoice && !in_array($invoice->lifecycle_status, [Invoice::STATUS_DRAFT, Invoice::STATUS_UNPAID])) {
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
            'status'                 => 'nullable|in:draft,proposed,approved,rejected,active,in_progress,pending_lab,completed,cancelled',
            'estimated_cost'         => 'nullable|numeric|min:0',
            'revision_notes'         => 'nullable|string|max:2000',
            'total_sessions_planned' => 'nullable|integer|min:1|max:50',
            'requires_specialist'    => 'nullable|boolean',
            'specialist_type'        => 'nullable|string|max:100',
        ]);

        $updates = array_filter($validated, fn($v) => $v !== null);
        if (!empty($updates['revision_notes']) || array_key_exists('estimated_cost', $updates)) {
            $updates['revision_number'] = ((int) $plan->revision_number) + 1;
        }
        if (($updates['status'] ?? null) === TreatmentPlan::STATUS_APPROVED) {
            $updates['approved_at'] = now();
            $updates['rejected_at'] = null;
        }
        if (($updates['status'] ?? null) === TreatmentPlan::STATUS_REJECTED) {
            $updates['rejected_at'] = now();
        }

        $plan->update($updates);

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
    public function propose(Request $request, int $id): JsonResponse
    {
        return $this->transitionApproval($request, $id, TreatmentPlan::STATUS_PROPOSED, 'Treatment plan proposed.');
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        return $this->transitionApproval($request, $id, TreatmentPlan::STATUS_APPROVED, 'Treatment plan approved.');
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return $this->transitionApproval($request, $id, TreatmentPlan::STATUS_REJECTED, 'Treatment plan rejected.');
    }

    private function transitionApproval(Request $request, int $id, string $status, string $message): JsonResponse
    {
        $dentist = $request->user();
        $plan = TreatmentPlan::forClinic($dentist->clinic_id)
            ->where('gp_id', $dentist->id)
            ->findOrFail($id);

        $updates = ['status' => $status];
        if ($status === TreatmentPlan::STATUS_APPROVED) {
            $updates['approved_at'] = now();
            $updates['rejected_at'] = null;
        }
        if ($status === TreatmentPlan::STATUS_REJECTED) {
            $updates['rejected_at'] = now();
        }

        $plan->update($updates);

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $this->formatPlan($plan->fresh()),
        ]);
    }

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

        if ($plan->initialAppointment && ($blocker = $plan->initialAppointment->completionBlocker())) {
            return response()->json([
                'success' => false,
                'message' => $blocker['message'],
                'code' => $blocker['code'],
                'data' => $blocker,
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
                \App\Models\QueueItem::recalculatePositions($appt->clinic_id, $appt->branch_id, $appt->dentist_id);
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

            $recall = \App\Models\Recall::create([
                'clinic_id'              => $plan->clinic_id,
                'branch_id'              => $plan->branch_id,
                'patient_id'             => $plan->patient_id,
                'appointment_id'         => $plan->initial_appointment_id,
                'dentist_id'             => $plan->gp_id,
                'recall_interval_months' => $months,
                'due_date'               => $recallDate,
                'notes'                  => "Auto-scheduled recall after: {$plan->title}",
                'status'                 => \App\Models\Recall::STATUS_PENDING,
            ]);

            // Notify patient
            $plan->loadMissing('patient');
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
                        'recall_id' => $recall->id,
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
            'estimated_cost'         => (float) ($plan->estimated_cost ?? 0),
            'revision_number'        => (int) ($plan->revision_number ?? 1),
            'revision_notes'         => $plan->revision_notes,
            'approved_at'            => $plan->approved_at?->toDateTimeString(),
            'rejected_at'            => $plan->rejected_at?->toDateTimeString(),
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

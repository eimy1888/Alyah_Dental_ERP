<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Events\ProcedureAdded;
use App\Events\ProcedureRemoved;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Procedure;
use App\Models\Service;
use App\Models\TreatmentEpisode;
use App\Models\XRay;
use App\Services\BillingCalculatorService;
use App\Services\InvoiceLifecycleService;
use App\Services\InventoryConsumptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MedicalRecordController extends Controller
{
    public function __construct(
        private BillingCalculatorService $calculator,
        private InvoiceLifecycleService  $lifecycle,
        private ?InventoryConsumptionService $inventory = null
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // UNIFIED MEDICAL RECORDS TIMELINE
    // GET /dentist/medical-records
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $patientId = $request->get('patient_id');
        $type      = $request->get('type');
        $fromDate  = $request->get('from_date');
        $toDate    = $request->get('to_date');
        $search    = $request->get('search');

        $records = collect();

        // Prescriptions
        if (!$type || $type === 'prescription') {
            $q = Prescription::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient');
            if ($patientId)  $q->forPatient($patientId);
            if ($fromDate)   $q->where('issued_at', '>=', $fromDate);
            if ($toDate)     $q->where('issued_at', '<=', $toDate);
            if ($search)     $q->whereHas('patient', fn($sq) => $sq->where('first_name','like',"%{$search}%")->orWhere('last_name','like',"%{$search}%"));
            $q->get()->each(fn($p) => $records->push($p->toMedicalRecord()));
        }

        // X-Rays
        if (!$type || $type === 'xray') {
            $q = XRay::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient');
            if ($patientId)  $q->forPatient($patientId);
            if ($fromDate)   $q->where('captured_at', '>=', $fromDate);
            if ($toDate)     $q->where('captured_at', '<=', $toDate);
            if ($search)     $q->whereHas('patient', fn($sq) => $sq->where('first_name','like',"%{$search}%")->orWhere('last_name','like',"%{$search}%"));
            $q->get()->each(fn($x) => $records->push($x->toMedicalRecord()));
        }

        // Clinical Notes
        if (!$type || $type === 'clinical_note') {
            $q = ClinicalNote::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient');
            if ($patientId)  $q->forPatient($patientId);
            if ($fromDate)   $q->where('created_at', '>=', $fromDate);
            if ($toDate)     $q->where('created_at', '<=', $toDate);
            if ($search)     $q->whereHas('patient', fn($sq) => $sq->where('first_name','like',"%{$search}%")->orWhere('last_name','like',"%{$search}%"));
            $q->get()->each(fn($n) => $records->push($n->toMedicalRecord()));
        }

        // Appointments
        if (!$type || $type === 'appointment') {
            $q = Appointment::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient');
            if ($patientId)  $q->forPatient($patientId);
            if ($fromDate)   $q->where('appointment_time', '>=', $fromDate);
            if ($toDate)     $q->where('appointment_time', '<=', $toDate);
            if ($search)     $q->whereHas('patient', fn($sq) => $sq->where('first_name','like',"%{$search}%")->orWhere('last_name','like',"%{$search}%"));
            $q->get()->each(fn($a) => $records->push([
                'id'           => $a->id,
                'type'         => 'appointment',
                'patient_id'   => $a->patient_id,
                'patient_name' => $a->patient?->full_name ?? '—',
                'date'         => $a->appointment_time->toDateString(),
                'description'  => "Appointment: {$a->type}",
                'details'      => [
                    'status'           => $a->status,
                    'notes'            => $a->notes,
                    'time'             => $a->appointment_time->format('H:i'),
                    'duration_minutes' => $a->duration_minutes,
                    'type'             => $a->type,
                ],
            ]));
        }

        $sorted   = $records->sortByDesc('date')->values();
        $summary  = [
            'total'          => $sorted->count(),
            'prescriptions'  => $sorted->where('type','prescription')->count(),
            'xrays'          => $sorted->where('type','xray')->count(),
            'clinical_notes' => $sorted->where('type','clinical_note')->count(),
            'appointments'   => $sorted->where('type','appointment')->count(),
        ];
        $patients = Patient::forClinic($clinicId)
            ->whereIn('id', $sorted->pluck('patient_id')->unique()->filter())
            ->get(['id','first_name','last_name'])
            ->map(fn($p) => ['id' => $p->id, 'full_name' => $p->full_name]);

        return response()->json(['success' => true, 'data' => compact('sorted', 'summary', 'patients')]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW SINGLE RECORD
    // GET /dentist/medical-records/{type}/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $dentist   = $request->user();
        $clinicId  = $dentist->clinic_id;
        $branchId  = $dentist->branch_id;
        $dentistId = $dentist->id;

        $data = match($type) {
            'prescription' => array_merge(
                ($r = Prescription::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient')->findOrFail($id))->toMedicalRecord(),
                ['full_details' => $r->toArray()]
            ),
            'xray' => array_merge(
                ($r = XRay::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient')->findOrFail($id))->toMedicalRecord(),
                ['full_details' => $r->toArray()]
            ),
            'clinical_note' => array_merge(
                ($r = ClinicalNote::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)->with('patient')->findOrFail($id))->toMedicalRecord(),
                ['full_details' => $r->toArray()]
            ),
            'appointment' => (function() use ($clinicId,$branchId,$dentistId,$id) {
                $r = Appointment::forClinic($clinicId)->forBranch($branchId)->forDentist($dentistId)
                    ->with(['patient','clinicalNotes','prescriptions','xRays'])->findOrFail($id);
                return ['id'=>$r->id,'type'=>'appointment','patient_id'=>$r->patient_id,
                    'patient_name'=>$r->patient?->full_name??'—','date'=>$r->appointment_time->toDateString(),
                    'description'=>"Appointment: {$r->type}",'details'=>['status'=>$r->status,'time'=>$r->appointment_time->format('H:i'),'duration_minutes'=>$r->duration_minutes,'type'=>$r->type],
                    'full_details'=>$r->toArray()];
            })(),
            default => null,
        };

        if (!$data) {
            return response()->json(['success'=>false,'message'=>'Invalid type. Use: prescription, xray, clinical_note, appointment.'],422);
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET PROCEDURES FOR APPOINTMENT
    // GET /dentist/procedures/appointment/{appointmentId}
    // ─────────────────────────────────────────────────────────────────────────
    public function getAppointmentProcedures(Request $request, int $appointmentId): JsonResponse
    {
        $dentist = $request->user();

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($appointmentId);

        $procedures = Procedure::where('appointment_id', $appointmentId)
            ->with('service')
            ->orderBy('sequence')
            ->orderBy('created_at')
            ->get()
            ->map(fn($p) => [
                'id'               => $p->id,
                'name'             => $p->name,
                'description'      => $p->description,
                'duration_minutes' => $p->duration_minutes,
                'price'            => (float) $p->price,
                'tooth_number'     => $p->tooth_number,
                'tooth_surface'    => $p->tooth_surface ?? null,
                'notes'            => $p->notes,
                'status'           => $p->status,
                'sequence'         => $p->sequence ?? 1,
                'episode_id'       => $p->treatment_episode_id,
                'formatted_price'  => 'ETB ' . number_format($p->price, 2),
                'created_at'       => $p->created_at->toDateTimeString(),
            ]);

        $treatmentInv = $appointment->getActiveTreatmentInvoice();

        return response()->json([
            'success' => true,
            'data'    => [
                'appointment_id'     => $appointmentId,
                'appointment_status' => $appointment->status,
                'billing_model'      => $appointment->billing_model ?? 'treatment',
                'procedures'         => $procedures,
                'total_duration'     => $procedures->sum('duration_minutes'),
                'total_price'        => $procedures->sum('price'),
                'billing_summary'    => $appointment->getBillingSummary(),
                'invoice_id'         => $treatmentInv?->id,
                'invoice_lifecycle'  => $treatmentInv?->lifecycle_status ?? $treatmentInv?->status,
                'invoice_total'      => (float) ($treatmentInv?->total ?? 0),
                'invoice_balance'    => (float) ($treatmentInv?->balance ?? 0),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADD PROCEDURE (v2 — through BillingCalculatorService)
    // POST /dentist/procedures
    // ─────────────────────────────────────────────────────────────────────────
    public function addProcedure(Request $request): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $validated = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'service_id'     => 'required|exists:services,id',
            'tooth_number'   => 'nullable|string|max:10',
            'tooth_surface'  => 'nullable|string|max:20',
            'notes'          => 'nullable|string|max:500',
            'quantity'       => 'nullable|integer|min:1|max:20',
            'episode_id'     => 'nullable|exists:treatment_episodes,id',
        ]);

        $quantity = (int) ($validated['quantity'] ?? 1);

        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($validated['appointment_id']);

        if (!in_array($appointment->status, ['checked_in', 'in_progress', 'treatment_started'])) {
            return response()->json([
                'success' => false,
                'message' => 'Procedures can only be added to checked-in or in-progress appointments.',
                'code'    => 'INVALID_APPOINTMENT_STATUS',
            ], 422);
        }

        // Resolve episode
        $episode = $this->resolveEpisode($appointment, $validated['episode_id'] ?? null, $dentist);

        // Resolve invoice
        $invoice = $episode->invoice;
        if (!$invoice) {
            $invoice = Invoice::createTreatmentInvoice($appointment, $dentist, $episode);
            $episode->update(['invoice_id' => $invoice->id]);
            $appointment->update(['treatment_invoice_id' => $invoice->id]);
        }

        if (!$invoice->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is locked. Cannot add procedures.',
                'code'    => 'INVOICE_LOCKED',
            ], 422);
        }

        $service  = Service::where('clinic_id', $clinicId)->findOrFail($validated['service_id']);
        $sequence = Procedure::where('treatment_episode_id', $episode->id)->count() + 1;

        DB::beginTransaction();
        try {
            $procedure = Procedure::create([
                'clinic_id'            => $clinicId,
                'branch_id'            => $branchId,
                'appointment_id'       => $appointment->id,
                'treatment_episode_id' => $episode->id,
                'patient_id'           => $appointment->patient_id,
                'dentist_id'           => $dentist->id,
                'service_id'           => $service->id,
                'name'                 => $service->name,
                'description'          => $service->description,
                'duration_minutes'     => (int) $service->duration_minutes * $quantity,
                'price'                => (float) $service->price * $quantity,
                'tooth_number'         => $validated['tooth_number'] ?? null,
                'tooth_surface'        => $validated['tooth_surface'] ?? null,
                'notes'                => $validated['notes'] ?? null,
                'status'               => 'performed',
                'sequence'             => $sequence,
            ]);

            // Route through BillingCalculatorService (projection → invoice item)
            $result = $this->calculator->processProcedure($procedure, $episode, $invoice, $dentist);

            if (!$result['success']) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => $result['message']], 422);
            }

            // Auto-create signed clinical note
            ClinicalNote::create([
                'clinic_id'      => $clinicId,
                'branch_id'      => $branchId,
                'patient_id'     => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'dentist_id'     => $dentist->id,
                'note_type'      => 'procedure',
                'content'        => "Performed: {$procedure->name}"
                    . ($procedure->tooth_number ? " on tooth #{$procedure->tooth_number}" : "")
                    . ($procedure->tooth_surface ? " [{$procedure->tooth_surface}]" : "")
                    . " — ETB " . number_format($result['pricing']['line_total'], 2),
                'is_signed' => true,
                'signed_at' => now(),
            ]);

            $appointment->patient?->pushMedicalCase(
                "Treatment: {$procedure->name}" . ($procedure->tooth_number ? " (tooth #{$procedure->tooth_number})" : ""),
                'procedure'
            );

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        event(new ProcedureAdded($procedure, $episode, $invoice->fresh(), $result['pricing']['line_total'], $dentist));

        return response()->json([
            'success' => true,
            'message' => 'Procedure added. Invoice updated in real-time.',
            'data'    => [
                'procedure'      => [
                    'id'               => $procedure->id,
                    'name'             => $procedure->name,
                    'duration_minutes' => $procedure->duration_minutes,
                    'price'            => (float) $procedure->price,
                    'tooth_number'     => $procedure->tooth_number,
                    'tooth_surface'    => $procedure->tooth_surface,
                    'formatted_price'  => 'ETB ' . number_format($procedure->price, 2),
                    'episode_id'       => $episode->id,
                ],
                'pricing'        => $result['pricing'],
                'invoice_impact' => $result['invoice_impact'],
            ],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE PROCEDURE (v2 — through BillingCalculatorService)
    // DELETE /dentist/procedures/{procedureId}
    // ─────────────────────────────────────────────────────────────────────────
    public function deleteProcedure(Request $request, int $procedureId): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $procedure = Procedure::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($procedureId);

        $appointment = $procedure->appointment;
        $episode     = $procedure->episode;

        // Get active invoice
        $invoice = $episode?->invoice
            ?? $appointment->getActiveTreatmentInvoice();

        if (!$invoice) {
            $procedure->delete();
            return response()->json(['success' => true, 'message' => 'Procedure removed.']);
        }

        if (!$invoice->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is locked. Cannot remove procedures.',
                'code'    => 'INVOICE_LOCKED',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $result = $this->calculator->removeProcedure($procedure, $invoice, $dentist);
            if (!$result['success']) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => $result['message']], 422);
            }
            ($this->inventory ?? app(InventoryConsumptionService::class))->restoreForProcedure($procedure, $dentist);
            $procedure->delete();
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        event(new ProcedureRemoved($procedure, $invoice->fresh(), $result['removed_amount'], $dentist));

        return response()->json([
            'success'        => true,
            'message'        => 'Procedure removed. Invoice updated.',
            'invoice_impact' => $result['invoice_impact'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMPLETE PROCEDURES & FINALIZE EPISODE
    // POST /dentist/procedures/complete/{appointmentId}
    // ─────────────────────────────────────────────────────────────────────────
    public function completeProcedures(Request $request, int $appointmentId): JsonResponse
    {
        $dentist  = $request->user();
        $clinicId = $dentist->clinic_id;
        $branchId = $dentist->branch_id;

        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($appointmentId);

        $procedureCount = Procedure::where('appointment_id', $appointmentId)
            ->where('status', 'performed')
            ->count();

        if ($procedureCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No performed procedures found. Add at least one procedure before completing.',
                'code'    => 'NO_PROCEDURES',
            ], 422);
        }

        // Finalize all open episodes and mark appointment completed
        DB::beginTransaction();
        try {
            $episodes = TreatmentEpisode::where('appointment_id', $appointment->id)
                ->whereIn('status', [TreatmentEpisode::STATUS_OPEN, TreatmentEpisode::STATUS_PENDING_LAB])
                ->get();

            $finalizedEpisodes = [];
            foreach ($episodes as $episode) {
                $result = $this->lifecycle->finalizeEpisode($episode, $dentist);
                if ($result['success']) {
                    $finalizedEpisodes[] = $episode->id;
                    if ($episode->invoice && $appointment) {
                        event(new \App\Events\EpisodeFinalized(
                            $episode->fresh(), $appointment, $episode->invoice->fresh(), $dentist
                        ));
                    }
                }
            }

            Procedure::where('appointment_id', $appointment->id)
                ->where('status', 'performed')
                ->with('service.inventoryItems')
                ->get()
                ->each(fn(Procedure $procedure) => ($this->inventory ?? app(InventoryConsumptionService::class))->consumeForProcedure($procedure, $dentist));

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Treatment completed. Invoice(s) submitted for accountant review.',
            'data'    => [
                'appointment_id'    => $appointment->id,
                'status'            => $appointment->fresh()->status,
                'finalized_episodes'=> $finalizedEpisodes,
                'billing_summary'   => $appointment->fresh()->getBillingSummary(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolve or auto-create a TreatmentEpisode for an appointment.
     */
    private function resolveEpisode(Appointment $appointment, ?int $episodeId, $dentist): TreatmentEpisode
    {
        if ($episodeId) {
            $episode = TreatmentEpisode::where('clinic_id', $appointment->clinic_id)
                ->where('appointment_id', $appointment->id)
                ->find($episodeId);
            if ($episode) return $episode;
        }

        // Use first open episode
        $episode = TreatmentEpisode::where('appointment_id', $appointment->id)
            ->where('status', TreatmentEpisode::STATUS_OPEN)
            ->first();

        if ($episode) return $episode;

        // Auto-create
        $phaseCount = TreatmentEpisode::where('appointment_id', $appointment->id)->count();

        return TreatmentEpisode::create([
            'clinic_id'      => $appointment->clinic_id,
            'branch_id'      => $appointment->branch_id,
            'appointment_id' => $appointment->id,
            'patient_id'     => $appointment->patient_id,
            'dentist_id'     => $dentist->id,
            'episode_type'   => TreatmentEpisode::TYPE_TREATMENT,
            'status'         => TreatmentEpisode::STATUS_OPEN,
            'phase_number'   => $phaseCount + 1,
            'title'          => 'Episode ' . ($phaseCount + 1),
            'opened_at'      => now(),
        ]);
    }
}

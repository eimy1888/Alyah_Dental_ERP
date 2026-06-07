<?php

namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BillingEvent;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Procedure;
use App\Models\Service;
use App\Models\TreatmentEpisode;
use App\Services\BillingCalculatorService;
use App\Services\InvoiceLifecycleService;
use App\Events\ProcedureAdded;
use App\Events\ProcedureRemoved;
use App\Events\EpisodeFinalized;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * TreatmentEpisodeController — dentist-side episode + billing management.
 *
 * Handles:
 *   - Opening new episodes (staged treatments)
 *   - Adding/removing procedures (goes through BillingCalculatorService)
 *   - Live billing preview
 *   - Episode finalization (triggers under_review)
 *   - Lab wait toggle
 */
class TreatmentEpisodeController extends Controller
{
    public function __construct(
        private BillingCalculatorService $calculator,
        private InvoiceLifecycleService  $lifecycle
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // LIST episodes for an appointment
    // GET /dentist/appointments/{appointmentId}/episodes
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request, int $appointmentId): JsonResponse
    {
        $dentist = $request->user();

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($appointmentId);

        $episodes = TreatmentEpisode::where('appointment_id', $appointment->id)
            ->with(['invoice.items', 'procedures.service', 'projections'])
            ->orderBy('phase_number')
            ->get()
            ->map(fn($ep) => $ep->getTimeline());

        return response()->json([
            'success'          => true,
            'data'             => $episodes,
            'billing_summary'  => $appointment->getBillingSummary(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OPEN a new episode (for staged/multi-phase treatment)
    // POST /dentist/appointments/{appointmentId}/episodes
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request, int $appointmentId): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'title'          => 'nullable|string|max:255',
            'diagnosis'      => 'nullable|string|max:2000',
            'treatment_plan' => 'nullable|string|max:2000',
        ]);

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('branch_id', $dentist->branch_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($appointmentId);

        $phaseCount = TreatmentEpisode::where('appointment_id', $appointment->id)->count();

        DB::beginTransaction();
        try {
            $episode = TreatmentEpisode::create([
                'clinic_id'      => $dentist->clinic_id,
                'branch_id'      => $dentist->branch_id,
                'appointment_id' => $appointment->id,
                'patient_id'     => $appointment->patient_id,
                'dentist_id'     => $dentist->id,
                'episode_type'   => TreatmentEpisode::TYPE_TREATMENT,
                'status'         => TreatmentEpisode::STATUS_OPEN,
                'phase_number'   => $phaseCount + 1,
                'title'          => $request->title ?? "Episode " . ($phaseCount + 1),
                'diagnosis'      => $request->diagnosis,
                'treatment_plan' => $request->treatment_plan,
                'opened_at'      => now(),
            ]);

            // Each new episode gets its own treatment invoice
            $invoice = Invoice::createTreatmentInvoice($appointment, $dentist, $episode);
            $episode->update(['invoice_id' => $invoice->id]);

            // Update appointment treatment_invoice_id to latest episode's invoice
            $appointment->update(['treatment_invoice_id' => $invoice->id]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Episode {$episode->phase_number} opened.",
            'data'    => $episode->getTimeline(),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE episode diagnosis / treatment plan
    // PUT /dentist/episodes/{episodeId}
    // ─────────────────────────────────────────────────────────────────────────
    public function update(Request $request, int $episodeId): JsonResponse
    {
        $dentist = $request->user();

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($episodeId);

        if (!$episode->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => "Episode is {$episode->status} and cannot be edited.",
            ], 422);
        }

        $request->validate([
            'title'          => 'nullable|string|max:255',
            'diagnosis'      => 'nullable|string|max:2000',
            'treatment_plan' => 'nullable|string|max:2000',
        ]);

        $episode->update($request->only('title', 'diagnosis', 'treatment_plan'));

        return response()->json([
            'success' => true,
            'message' => 'Episode updated.',
            'data'    => $episode->getTimeline(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADD PROCEDURE → goes through BillingCalculatorService (not direct to invoice)
    // POST /dentist/episodes/{episodeId}/procedures
    // ─────────────────────────────────────────────────────────────────────────
    public function addProcedure(Request $request, int $episodeId): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'service_id'   => 'required|exists:services,id',
            'tooth_number' => 'nullable|string|max:10',
            'tooth_surface'=> 'nullable|string|max:20',
            'notes'        => 'nullable|string|max:500',
            'quantity'     => 'nullable|integer|min:1|max:20',
        ]);

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->with('invoice')
            ->findOrFail($episodeId);

        if (!$episode->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => "Episode is {$episode->status}. Cannot add procedures.",
                'code'    => 'EPISODE_NOT_EDITABLE',
            ], 422);
        }

        // Ensure invoice exists
        $invoice = $episode->invoice;
        if (!$invoice) {
            $appointment = $episode->appointment;
            $invoice = Invoice::createTreatmentInvoice($appointment, $dentist, $episode);
            $episode->update(['invoice_id' => $invoice->id]);
        }

        if (!$invoice->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is locked. Cannot add procedures.',
                'code'    => 'INVOICE_LOCKED',
            ], 422);
        }

        $service  = Service::where('clinic_id', $dentist->clinic_id)->findOrFail($request->service_id);
        $quantity = (int) ($request->quantity ?? 1);

        $sequence = Procedure::where('treatment_episode_id', $episode->id)->count() + 1;

        DB::beginTransaction();
        try {
            // 1. Create procedure record
            $procedure = Procedure::create([
                'clinic_id'            => $dentist->clinic_id,
                'branch_id'            => $dentist->branch_id,
                'appointment_id'       => $episode->appointment_id,
                'treatment_episode_id' => $episode->id,
                'patient_id'           => $episode->patient_id,
                'dentist_id'           => $dentist->id,
                'service_id'           => $service->id,
                'name'                 => $service->name,
                'description'          => $service->description,
                'duration_minutes'     => $service->duration_minutes * $quantity,
                'price'                => (float) $service->price * $quantity,
                'tooth_number'         => $request->tooth_number,
                'tooth_surface'        => $request->tooth_surface,
                'notes'                => $request->notes,
                'status'               => 'performed',
                'sequence'             => $sequence,
            ]);

            // 2. Process through BillingCalculator (projection layer → invoice item)
            $result = $this->calculator->processProcedure($procedure, $episode, $invoice, $dentist);

            if (!$result['success']) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => $result['message']], 422);
            }

            // 3. Auto-create signed clinical note
            ClinicalNote::create([
                'clinic_id'      => $dentist->clinic_id,
                'branch_id'      => $dentist->branch_id,
                'patient_id'     => $episode->patient_id,
                'appointment_id' => $episode->appointment_id,
                'dentist_id'     => $dentist->id,
                'note_type'      => 'procedure',
                'content'        => "Performed: {$procedure->name}"
                    . ($procedure->tooth_number ? " on tooth #{$procedure->tooth_number}" : "")
                    . ($procedure->tooth_surface ? " [{$procedure->tooth_surface}]" : "")
                    . " — Duration: {$procedure->duration_minutes}min"
                    . " — ETB " . number_format($result['pricing']['line_total'], 2),
                'is_signed'      => true,
                'signed_at'      => now(),
            ]);

            // 4. Update patient medical cases
            $episode->patient?->pushMedicalCase(
                "Treatment: {$procedure->name}" . ($procedure->tooth_number ? " (tooth #{$procedure->tooth_number})" : ""),
                'procedure'
            );

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        // 5. Fire event (listener logs BillingEvent)
        event(new ProcedureAdded(
            $procedure,
            $episode,
            $invoice->fresh(),
            $result['pricing']['line_total'],
            $dentist
        ));

        return response()->json([
            'success' => true,
            'message' => 'Procedure added. Invoice updated in real-time.',
            'data'    => [
                'procedure'      => [
                    'id'               => $procedure->id,
                    'name'             => $procedure->name,
                    'tooth_number'     => $procedure->tooth_number,
                    'duration_minutes' => $procedure->duration_minutes,
                    'sequence'         => $procedure->sequence,
                ],
                'pricing'        => $result['pricing'],
                'invoice_impact' => $result['invoice_impact'],
                'episode'        => $episode->fresh()->getTimeline(),
            ],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REMOVE PROCEDURE
    // DELETE /dentist/episodes/{episodeId}/procedures/{procedureId}
    // ─────────────────────────────────────────────────────────────────────────
    public function removeProcedure(Request $request, int $episodeId, int $procedureId): JsonResponse
    {
        $dentist = $request->user();

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($episodeId);

        if (!$episode->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => "Episode is {$episode->status}. Cannot remove procedures.",
            ], 422);
        }

        $procedure = Procedure::where('treatment_episode_id', $episode->id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($procedureId);

        $invoice = $episode->invoice;
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'No invoice found.'], 404);
        }

        DB::beginTransaction();
        try {
            $result = $this->calculator->removeProcedure($procedure, $invoice, $dentist);
            if (!$result['success']) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => $result['message']], 422);
            }
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
            'episode'        => $episode->fresh()->getTimeline(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIVE BILLING PREVIEW
    // GET /dentist/appointments/{appointmentId}/billing
    // ─────────────────────────────────────────────────────────────────────────
    public function billingPreview(Request $request, int $appointmentId): JsonResponse
    {
        $dentist = $request->user();

        $appointment = Appointment::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($appointmentId);

        $billing = $this->lifecycle->getConsolidatedBilling($appointment);

        return response()->json([
            'success' => true,
            'data'    => $billing,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FINALIZE EPISODE (dentist signs off → invoice goes to under_review)
    // POST /dentist/episodes/{episodeId}/finalize
    // ─────────────────────────────────────────────────────────────────────────
    public function finalize(Request $request, int $episodeId): JsonResponse
    {
        $dentist = $request->user();

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->with(['invoice', 'appointment'])
            ->findOrFail($episodeId);

        $result = $this->lifecycle->finalizeEpisode($episode, $dentist);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        // Fire event
        if ($episode->invoice && $episode->appointment) {
            event(new EpisodeFinalized(
                $episode->fresh(),
                $episode->appointment,
                $episode->invoice->fresh(),
                $dentist
            ));
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data'    => $result['data'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK PENDING LAB (pause episode without blocking invoice)
    // POST /dentist/episodes/{episodeId}/pending-lab
    // ─────────────────────────────────────────────────────────────────────────
    public function markPendingLab(Request $request, int $episodeId): JsonResponse
    {
        $dentist = $request->user();

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($episodeId);

        $episode->waitForLab($request->notes ?? '');

        return response()->json([
            'success' => true,
            'message' => 'Episode marked as pending lab. Invoice remains open.',
            'data'    => ['episode_id' => $episode->id, 'status' => $episode->fresh()->status],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESUME FROM LAB
    // POST /dentist/episodes/{episodeId}/resume
    // ─────────────────────────────────────────────────────────────────────────
    public function resumeFromLab(Request $request, int $episodeId): JsonResponse
    {
        $dentist = $request->user();

        $episode = TreatmentEpisode::where('clinic_id', $dentist->clinic_id)
            ->where('dentist_id', $dentist->id)
            ->findOrFail($episodeId);

        $episode->resumeFromLab();

        return response()->json([
            'success' => true,
            'message' => 'Episode resumed.',
            'data'    => ['episode_id' => $episode->id, 'status' => $episode->fresh()->status],
        ]);
    }
}

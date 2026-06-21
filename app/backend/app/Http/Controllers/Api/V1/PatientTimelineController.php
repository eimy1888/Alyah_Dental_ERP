<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\LabOrder;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\Procedure;
use App\Models\QueueItem;
use App\Models\Recall;
use App\Models\TreatmentPlan;
use App\Models\XRay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientTimelineController extends Controller
{
    public function show(Request $request, int $patientId): JsonResponse
    {
        $user = $request->user();
        $patient = Patient::where('clinic_id', $user->clinic_id)->findOrFail($patientId);

        if ($user->role === 'patient' && (int) $patient->user_id !== (int) $user->id) {
            abort(403);
        }

        if (in_array($user->role, ['dentist', 'receptionist', 'accountant', 'branch_manager']) && $user->branch_id && (int) $patient->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

        $type = $request->get('type');
        $from = $request->get('from');
        $to = $request->get('to');
        $items = collect();

        $push = function (string $itemType, $date, string $title, array $details = []) use ($items, $type, $from, $to) {
            if ($type && $type !== $itemType) return;
            if (!$date) return;
            $day = $date instanceof \Carbon\CarbonInterface ? $date : \Carbon\Carbon::parse($date);
            if ($from && $day->lt(\Carbon\Carbon::parse($from)->startOfDay())) return;
            if ($to && $day->gt(\Carbon\Carbon::parse($to)->endOfDay())) return;
            $items->push(['type' => $itemType, 'date' => $day->toDateTimeString(), 'title' => $title, 'details' => $details]);
        };

        Appointment::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($a) => $push('appointment', $a->appointment_time, "Appointment: {$a->type}", ['status' => $a->status, 'dentist_id' => $a->dentist_id]));

        Procedure::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($p) => $push('procedure', $p->created_at, "Procedure: {$p->name}", ['status' => $p->status, 'price' => (float) $p->price]));

        Prescription::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($p) => $push('prescription', $p->issued_at ?? $p->date ?? $p->created_at, 'Prescription issued', ['status' => $p->status, 'dentist_id' => $p->dentist_id]));

        ClinicalNote::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($n) => $push('clinical_note', $n->signed_at ?? $n->created_at, $n->title ?: 'Clinical note', ['signed_at' => $n->signed_at?->toDateTimeString()]));

        XRay::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($x) => $push('xray', $x->taken_at ?? $x->captured_at ?? $x->created_at, $x->description ?: 'X-ray', ['file_path' => $x->file_path]));

        LabOrder::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($l) => $push('lab_order', $l->created_at, "Lab order: {$l->order_type}", ['status' => $l->status]));

        TreatmentPlan::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($p) => $push('treatment_plan', $p->created_at, $p->title ?: 'Treatment plan', ['status' => $p->status, 'estimated_cost' => (float) ($p->estimated_cost ?? 0)]));

        Invoice::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($i) => $push('invoice', $i->issued_at ?? $i->created_at, "Invoice {$i->invoice_number}", ['status' => $i->status, 'balance' => (float) $i->balance]));

        Payment::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($p) => $push('payment', $p->paid_at ?? $p->created_at, 'Payment recorded', ['amount' => (float) $p->amount, 'method' => $p->method]));

        Recall::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($r) => $push('recall', $r->due_date, 'Recall reminder', ['status' => $r->status]));

        QueueItem::where('patient_id', $patient->id)->where('clinic_id', $user->clinic_id)->get()
            ->each(fn($q) => $push('queue_item', $q->created_at, 'Queue activity', ['status' => $q->status, 'priority' => $q->priority]));

        $sorted = $items->sortByDesc('date')->values();
        $page = max((int) $request->get('page', 1), 1);
        $perPage = min((int) $request->get('per_page', 50), 100);

        return response()->json([
            'success' => true,
            'data' => [
                'patient' => ['id' => $patient->id, 'full_name' => $patient->full_name],
                'items' => $sorted->forPage($page, $perPage)->values(),
                'summary' => $sorted->groupBy('type')->map->count(),
            ],
            'meta' => ['total' => $sorted->count(), 'current_page' => $page, 'per_page' => $perPage],
        ]);
    }
}

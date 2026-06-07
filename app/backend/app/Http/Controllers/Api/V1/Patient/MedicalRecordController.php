<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Prescription;
use App\Models\ClinicalNote;
use App\Models\XRay;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;

class MedicalRecordController extends Controller
{
    /**
     * Get the patient ID from the logged-in user
     */
    private function getPatientId($user): ?int
    {
        // If user role is patient, get the linked patient id
        if ($user->role === 'patient') {
            // Check if user has a patient record linked
            if ($user->patient) {
                return $user->patient->id;
            }
            // Fallback: try to find patient by email
            $patient = \App\Models\Patient::where('email', $user->email)->first();
            if ($patient) {
                return $patient->id;
            }
            // Fallback: try by user_id
            $patient = \App\Models\Patient::where('user_id', $user->id)->first();
            if ($patient) {
                return $patient->id;
            }
        }
        return null;
    }

    // ── Unified medical records timeline ─────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => true,
                'data' => [
                    'records' => [],
                    'summary' => [
                        'total' => 0,
                        'prescriptions' => 0,
                        'clinical_notes' => 0,
                        'xrays' => 0,
                        'invoices' => 0,
                        'payments' => 0,
                    ],
                ],
            ]);
        }
        
        // Filters
        $type = $request->get('type');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        
        $records = collect();

        // ── Prescriptions ────────────────────────────────────────────────
        if (!$type || $type === 'prescription') {
            $query = Prescription::where('patient_id', $patientId);
            
            if ($fromDate) $query->whereDate('issued_at', '>=', $fromDate);
            if ($toDate) $query->whereDate('issued_at', '<=', $toDate);
            
            $query->orderByDesc('issued_at')->get()->each(fn($p) => 
                $records->push([
                    'id' => $p->id,
                    'type' => 'prescription',
                    'date' => $p->issued_at->toDateString(),
                    'title' => $p->medication,
                    'description' => $p->dosage . ' · ' . $p->duration_days . ' days',
                    'details' => [
                        'medication' => $p->medication,
                        'dosage' => $p->dosage,
                        'duration_days' => $p->duration_days,
                        'instructions' => $p->instructions,
                        'issued_at' => $p->issued_at->toDateString(),
                    ],
                ])
            );
        }

        // ── Clinical Notes ───────────────────────────────────────────────
        if (!$type || $type === 'clinical_note') {
            $query = ClinicalNote::where('patient_id', $patientId);
            
            if ($fromDate) $query->whereDate('created_at', '>=', $fromDate);
            if ($toDate) $query->whereDate('created_at', '<=', $toDate);
            
            $query->orderByDesc('created_at')->get()->each(fn($n) => 
                $records->push([
                    'id' => $n->id,
                    'type' => 'clinical_note',
                    'date' => $n->created_at->toDateString(),
                    'title' => $n->note_type,
                    'description' => $n->content_snippet ?? substr($n->content, 0, 100),
                    'details' => [
                        'note_type' => $n->note_type,
                        'content' => $n->content,
                        'is_signed' => $n->is_signed,
                        'signed_at' => $n->signed_at?->toDateString(),
                    ],
                ])
            );
        }

        // ── X-Rays ──────────────────────────────────────────────────────
        if (!$type || $type === 'xray') {
            $query = XRay::where('patient_id', $patientId);
            
            if ($fromDate) $query->whereDate('captured_at', '>=', $fromDate);
            if ($toDate) $query->whereDate('captured_at', '<=', $toDate);
            
            $query->orderByDesc('captured_at')->get()->each(fn($x) => 
                $records->push([
                    'id' => $x->id,
                    'type' => 'xray',
                    'date' => $x->captured_at->toDateString(),
                    'title' => $x->study_type,
                    'description' => $x->region ?? 'Full arch',
                    'details' => [
                        'study_type' => $x->study_type,
                        'findings' => $x->findings,
                        'status' => $x->status,
                        'file_url' => $x->file_url,
                    ],
                ])
            );
        }

        // ── Invoices ─────────────────────────────────────────────────────
        if (!$type || $type === 'invoice') {
            $query = Invoice::where('patient_id', $patientId);
            
            if ($fromDate) $query->whereDate('issued_at', '>=', $fromDate);
            if ($toDate) $query->whereDate('issued_at', '<=', $toDate);
            
            $query->orderByDesc('issued_at')->get()->each(fn($i) => 
                $records->push([
                    'id' => $i->id,
                    'type' => 'invoice',
                    'date' => $i->issued_at->toDateString(),
                    'title' => 'Invoice ' . $i->invoice_number,
                    'description' => 'Total: ETB ' . number_format($i->total, 2),
                    'details' => [
                        'invoice_number' => $i->invoice_number,
                        'total' => $i->total,
                        'paid_amount' => $i->paid_amount,
                        'balance_due' => $i->balance,
                        'status' => $i->status,
                        'due_date' => $i->due_date?->toDateString(),
                    ],
                ])
            );
        }

        // ── Payments ─────────────────────────────────────────────────────
        if (!$type || $type === 'payment') {
            $query = Payment::where('patient_id', $patientId);
            
            if ($fromDate) $query->whereDate('paid_at', '>=', $fromDate);
            if ($toDate) $query->whereDate('paid_at', '<=', $toDate);
            
            $query->orderByDesc('paid_at')->get()->each(fn($p) => 
                $records->push([
                    'id' => $p->id,
                    'type' => 'payment',
                    'date' => $p->paid_at->toDateString(),
                    'title' => 'Payment of ETB ' . number_format($p->amount, 2),
                    'description' => 'Method: ' . ucfirst($p->payment_method),
                    'details' => [
                        'amount' => $p->amount,
                        'payment_method' => $p->payment_method,
                        'reference' => $p->reference,
                        'invoice_id' => $p->invoice_id,
                        'paid_at' => $p->paid_at->toDateString(),
                    ],
                ])
            );
        }

        // ── Sort by date descending ──────────────────────────────────────
        $sorted = $records->sortByDesc('date')->values();

        // ── Summary counts ───────────────────────────────────────────────
        $summary = [
            'total' => $sorted->count(),
            'prescriptions' => $sorted->where('type', 'prescription')->count(),
            'clinical_notes' => $sorted->where('type', 'clinical_note')->count(),
            'xrays' => $sorted->where('type', 'xray')->count(),
            'invoices' => $sorted->where('type', 'invoice')->count(),
            'payments' => $sorted->where('type', 'payment')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'records' => $sorted,
                'summary' => $summary,
            ],
        ]);
    }

    // ── Show single record detail ────────────────────────────────────────
    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
            ], 404);
        }

        switch ($type) {
            case 'prescription':
                $record = Prescription::where('patient_id', $patientId)->findOrFail($id);
                $data = [
                    'type' => 'prescription',
                    'date' => $record->issued_at->toDateString(),
                    'title' => $record->medication,
                    'details' => [
                        'medication' => $record->medication,
                        'dosage' => $record->dosage,
                        'duration_days' => $record->duration_days,
                        'instructions' => $record->instructions,
                        'issued_at' => $record->issued_at->toDateString(),
                    ],
                ];
                break;

            case 'clinical_note':
                $record = ClinicalNote::where('patient_id', $patientId)->findOrFail($id);
                $data = [
                    'type' => 'clinical_note',
                    'date' => $record->created_at->toDateString(),
                    'title' => $record->note_type,
                    'details' => [
                        'note_type' => $record->note_type,
                        'content' => $record->content,
                        'is_signed' => $record->is_signed,
                        'signed_at' => $record->signed_at?->toDateString(),
                    ],
                ];
                break;

            case 'xray':
                $record = XRay::where('patient_id', $patientId)->findOrFail($id);
                $data = [
                    'type' => 'xray',
                    'date' => $record->captured_at->toDateString(),
                    'title' => $record->study_type,
                    'details' => [
                        'study_type' => $record->study_type,
                        'findings' => $record->findings,
                        'status' => $record->status,
                        'file_url' => $record->file_url,
                    ],
                ];
                break;

            case 'invoice':
                $record = Invoice::where('patient_id', $patientId)->findOrFail($id);
                $data = [
                    'type' => 'invoice',
                    'date' => $record->issued_at->toDateString(),
                    'title' => 'Invoice ' . $record->invoice_number,
                    'details' => [
                        'invoice_number' => $record->invoice_number,
                        'total' => $record->total,
                        'paid_amount' => $record->paid_amount,
                        'balance_due' => $record->balance,
                        'status' => $record->status,
                        'due_date' => $record->due_date?->toDateString(),
                    ],
                ];
                break;

            case 'payment':
                $record = Payment::where('patient_id', $patientId)->findOrFail($id);
                $data = [
                    'type' => 'payment',
                    'date' => $record->paid_at->toDateString(),
                    'title' => 'Payment of ETB ' . number_format($record->amount, 2),
                    'details' => [
                        'amount' => $record->amount,
                        'payment_method' => $record->payment_method,
                        'reference' => $record->reference,
                        'paid_at' => $record->paid_at->toDateString(),
                    ],
                ];
                break;

            default:
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid record type.',
                ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
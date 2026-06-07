<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private function getPatientId($user): ?int
    {
        if ($user->role !== 'patient') return null;
        if ($user->patient)            return $user->patient->id;

        return Patient::where('user_id', $user->id)->value('id')
            ?? Patient::where('email', $user->email)->value('id');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST — GET /patient/invoices
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user      = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => true,
                'data'    => [],
                'meta'    => ['total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => 10],
            ]);
        }

        $query = Invoice::where('patient_id', $patientId)
            ->with(['items'])
            ->orderByDesc('issued_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // v2: filter by type
        if ($request->filled('invoice_type')) {
            $query->where('invoice_type', $request->invoice_type);
        }

        $invoices = $query->paginate($request->get('per_page', 10));

        return response()->json([
            'success' => true,
            'data'    => $invoices->map(fn($inv) => $this->formatInvoice($inv)),
            'meta'    => [
                'total'        => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW — GET /patient/invoices/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $user      = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json(['success' => false, 'message' => 'Patient not found.'], 404);
        }

        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $id)
            ->with(['items', 'payments', 'episode'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $this->formatInvoice($invoice),
                [
                    'items'    => $invoice->items->map(fn($i) => [
                        'id'          => $i->id,
                        'description' => $i->description,
                        'quantity'    => $i->quantity,
                        'unit_price'  => (float) $i->unit_price,
                        'discount'    => (float) ($i->discount ?? 0),
                        'total'       => (float) $i->total,
                        'item_type'   => $i->item_type ?? 'manual',
                    ]),
                    'payments' => $invoice->payments->map(fn($p) => [
                        'id'        => $p->id,
                        'amount'    => (float) $p->amount,
                        'method'    => $p->method ?? $p->payment_method,
                        'reference' => $p->reference,
                        'paid_at'   => $p->paid_at?->toDateString(),
                    ]),
                ]
            ),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY — GET /patient/invoices/summary
    // ─────────────────────────────────────────────────────────────────────────
    public function summary(Request $request): JsonResponse
    {
        $user      = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json(['success' => true, 'data' => [
                'total' => 0, 'paid' => 0, 'unpaid' => 0, 'overdue' => 0,
                'total_amount' => 0, 'total_balance' => 0,
            ]]);
        }

        $invoices = Invoice::where('patient_id', $patientId)->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total'        => $invoices->count(),
                'paid'         => $invoices->where('status', 'paid')->count(),
                'unpaid'       => $invoices->whereIn('status', ['sent', 'partial', 'overdue'])->count(),
                'overdue'      => $invoices->where('status', 'overdue')->count(),
                'total_amount' => (float) $invoices->sum('total'),
                'total_balance'=> (float) $invoices->sum('balance'),
                // v2: by type
                'service_invoices'   => $invoices->where('invoice_type', 'service')->count(),
                'treatment_invoices' => $invoices->where('invoice_type', 'treatment')->count(),
            ],
        ]);
    }

    // ── Private formatter ─────────────────────────────────────────────────────

    private function formatInvoice(Invoice $inv): array
    {
        return [
            'id'               => $inv->id,
            'invoice_number'   => $inv->invoice_number,
            // v2 fields
            'invoice_type'     => $inv->invoice_type ?? 'service',
            'lifecycle_status' => $inv->lifecycle_status ?? $inv->status,
            // financial
            'subtotal'         => (float) $inv->items->sum(fn($i) => $i->quantity * $i->unit_price),
            'tax_rate'         => (float) ($inv->tax_rate ?? 15),
            'tax_amount'       => (float) ($inv->tax_amount ?? 0),
            'discount_total'   => (float) ($inv->discount_total ?? 0),
            'insurance_coverage'=> (float) ($inv->insurance_coverage ?? 0),
            'total'            => (float) $inv->total,
            'paid'             => (float) $inv->paid,
            'pre_paid'         => (float) ($inv->pre_paid ?? 0),
            'balance'          => (float) $inv->balance,
            // legacy
            'status'           => $inv->status,
            'issued_at'        => $inv->issued_at?->toDateString(),
            'due_date'         => $inv->due_date?->toDateString(),
            'notes'            => $inv->notes,
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    // ── Invoices ──────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/clinic/billing/invoices
     */
    public function invoices(Request $request): JsonResponse
    {
        $search   = $request->get('search', '');
        $status   = $request->get('status', '');
        $clinicId = $this->clinicId();

        $invoices = Invoice::forClinic($clinicId)
            ->with('patient:id,first_name,last_name', 'branch:id,name')
            ->when($search, fn($q) =>
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', fn($q2) =>
                      $q2->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%")
                  )
            )
            ->when($status, fn($q) => $q->where('status', $status))
            ->latest()
            ->get();

        // KPI summary
        $summary = [
            'open_count'        => $invoices->whereIn('status', ['sent', 'partial', 'overdue'])->count(),
            'collected_today'   => Payment::forClinic($clinicId)
                ->whereDate('paid_at', today())
                ->where('status', 'completed')
                ->sum('amount'),
            'outstanding_total' => $invoices->whereIn('status', ['sent', 'partial', 'overdue'])->sum('balance'),
            'overdue_count'     => $invoices->where('status', 'overdue')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $invoices,
            'summary' => $summary,
        ]);
    }

    /**
     * GET /api/v1/clinic/billing/invoices/{invoice}
     */
    public function showInvoice(Invoice $invoice): JsonResponse
    {
        if ($invoice->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $invoice->load(['patient', 'branch:id,name', 'items', 'payments']),
        ]);
    }

    /**
     * POST /api/v1/clinic/billing/invoices
     */
    public function createInvoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'branch_id'  => 'nullable|integer|exists:branches,id',
            'items'      => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'due_date'   => 'nullable|date',
            'notes'      => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $clinicId = $this->clinicId();

            $invoice = Invoice::create([
                'clinic_id'      => $clinicId,
                'branch_id'      => $validated['branch_id'] ?? null,
                'patient_id'     => $validated['patient_id'],
                'created_by'     => $request->user()->id,
                'invoice_number' => Invoice::generateNumber($clinicId),
                'due_date'       => $validated['due_date'] ?? null,
                'notes'          => $validated['notes'] ?? null,
                'issued_at'      => today(),
                'status'         => 'sent',
                'total'          => 0,
                'paid'           => 0,
                'balance'        => 0,
            ]);

            foreach ($validated['items'] as $item) {
                $invoice->items()->create($item);
            }

            $invoice->recalculate();

            return response()->json([
                'success' => true,
                'message' => 'Invoice created.',
                'data'    => $invoice->load(['patient', 'items']),
            ], 201);
        });
    }

    /**
     * POST /api/v1/clinic/billing/invoices/{invoice}/pay
     * Record a payment against an invoice.
     */
    public function recordPayment(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'amount'    => 'required|numeric|min:0.01',
            'method'    => 'required|in:cash,telebirr,chapa,bank_transfer,insurance',
            'reference' => 'nullable|string|max:100',
            'notes'     => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $invoice, $request) {
            $payment = Payment::create([
                'clinic_id'    => $this->clinicId(),
                'branch_id'    => $invoice->branch_id,
                'invoice_id'   => $invoice->id,
                'patient_id'   => $invoice->patient_id,
                'collected_by' => $request->user()->id,
                'amount'       => $validated['amount'],
                'method'       => $validated['method'],
                'reference'    => $validated['reference'] ?? null,
                'notes'        => $validated['notes'] ?? null,
                'status'       => 'completed',
                'paid_at'      => now(),
            ]);

            $invoice->recalculate();

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded.',
                'data'    => [
                    'payment' => $payment,
                    'invoice' => $invoice->fresh(),
                ],
            ]);
        });
    }

    // ── Recent payments ───────────────────────────────────────────────────────

    /**
     * GET /api/v1/clinic/billing/payments
     */
    public function payments(Request $request): JsonResponse
    {
        $clinicId = $this->clinicId();

        $payments = Payment::forClinic($clinicId)
            ->with('patient:id,first_name,last_name', 'invoice:id,invoice_number')
            ->where('status', 'completed')
            ->latest('paid_at')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $payments,
        ]);
    }

    // ── Weekly collections chart data ─────────────────────────────────────────

    /**
     * GET /api/v1/clinic/billing/weekly-collections
     */
    public function weeklyCollections(): JsonResponse
    {
        $clinicId = $this->clinicId();

        $data = Payment::forClinic($clinicId)
            ->where('status', 'completed')
            ->where('paid_at', '>=', now()->startOfWeek())
            ->selectRaw('DAYNAME(paid_at) as day, SUM(amount) as amount')
            ->groupBy('day')
            ->orderBy('paid_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
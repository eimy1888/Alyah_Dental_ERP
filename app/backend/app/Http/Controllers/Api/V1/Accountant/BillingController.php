<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\InsuranceClaim;
use App\Models\Tax;
use App\Models\Patient;
use App\Models\Branch;
use Carbon\Carbon;

class BillingController extends Controller
{
    public function getPatients(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $patients = Patient::where('clinic_id', $clinicId)
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'phone']);
        return response()->json([
            'success' => true,
            'data' => $patients->map(fn($p) => [
                'id'    => $p->id,
                'name'  => "{$p->first_name} {$p->last_name}",
                'phone' => $p->phone,
            ]),
        ]);
    }

    public function getBranches(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $branches = Branch::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'location']);
        return response()->json(['success' => true, 'data' => $branches]);
    }

    public function getInvoices(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $query    = Invoice::forClinic($clinicId)->with(['patient', 'branch']);

        if ($request->filled('status') && $request->status !== 'all')
            $query->where('status', $request->status);
        if ($request->filled('branch_id') && $request->branch_id !== 'all')
            $query->where('branch_id', $request->branch_id);
        if ($request->filled('patient_id'))
            $query->where('patient_id', $request->patient_id);
        if ($request->filled('from_date'))
            $query->whereDate('issued_at', '>=', $request->from_date);
        if ($request->filled('to_date'))
            $query->whereDate('issued_at', '<=', $request->to_date);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                  ->orWhereHas('patient', fn($pq) =>
                      $pq->where('first_name', 'like', "%{$s}%")
                         ->orWhere('last_name',  'like', "%{$s}%")
                  );
            });
        }

        $invoices = $query->orderByDesc('issued_at')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $invoices->map(fn($i) => $this->formatInvoice($i)),
            'meta'    => [
                'total'        => $invoices->total(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
            ],
        ]);
    }

    public function showInvoice(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $invoice  = Invoice::forClinic($clinicId)
            ->with(['patient', 'branch', 'items', 'payments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'             => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'patient_id'     => $invoice->patient_id,
                'patient_name'   => $invoice->patient?->full_name ?? '—',
                'patient_phone'  => $invoice->patient?->phone ?? '—',
                'branch_id'      => $invoice->branch_id,
                'branch_name'    => $invoice->branch?->name ?? '—',
                'issued_at'      => $invoice->issued_at?->toDateString(),
                'due_date'       => $invoice->due_date?->toDateString(),
                'total'          => (float) $invoice->total,
                'paid_amount'    => (float) $invoice->paid,
                'balance_due'    => (float) $invoice->balance,
                'status'         => $invoice->status,
                'items'          => $invoice->items->map(fn($item) => [
                    'id'          => $item->id,
                    'description' => $item->description,
                    'quantity'    => $item->quantity,
                    'unit_price'  => $item->unit_price,
                    'total'       => $item->total,
                ]),
                'payments'       => $invoice->payments->map(fn($p) => [
                    'id'        => $p->id,
                    'amount'    => (float) $p->amount,
                    'method'    => $p->payment_method,
                    'reference' => $p->reference,
                    'paid_at'   => $p->paid_at?->toDateString(),
                ]),
            ],
        ]);
    }

    public function createInvoice(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;

        $request->validate([
            'patient_id'          => 'required|exists:patients,id',
            'branch_id'           => 'required|exists:branches,id',
            'due_date'            => 'required|date',
            'items'               => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        $subtotal = collect($request->items)
            ->sum(fn($i) => $i['quantity'] * $i['unit_price']);
        $total = $subtotal;

        $last          = Invoice::forClinic($clinicId)->orderByDesc('id')->first();
        $nextNum       = $last ? intval(substr($last->invoice_number, -4)) + 1 : 1;
        $invoiceNumber = 'INV-' . date('Ymd') . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

        $invoice = Invoice::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $request->branch_id,
            'patient_id'     => $request->patient_id,
            'invoice_number' => $invoiceNumber,
            'issued_at'      => Carbon::now(),
            'due_date'       => $request->due_date,
            'total'          => $total,
            'paid'           => 0,
            'balance'        => $total,
            'status'         => 'sent',
            'created_by'     => $accountant->id,
        ]);

        foreach ($request->items as $item) {
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'description' => $item['description'],
                'quantity'    => $item['quantity'],
                'unit_price'  => $item['unit_price'],
                'total'       => $item['quantity'] * $item['unit_price'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice created successfully.',
            'data'    => $this->formatInvoice($invoice->fresh(['patient', 'branch'])),
        ], 201);
    }

    // ── Record payment — identical logic to receptionist, plus card activation ──
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;

        $invoice = Invoice::forClinic($clinicId)->findOrFail($id);

        $request->validate([
            'amount'         => 'required|numeric|min:0.01|max:' . $invoice->balance,
            'payment_method' => 'required|in:cash,telebirr,chapa,bank_transfer,insurance',
            'reference'      => 'nullable|string|max:255',
        ]);

        $amount = (float) $request->amount;

        Payment::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $invoice->branch_id,
            'invoice_id'     => $invoice->id,
            'patient_id'     => $invoice->patient_id,
            'amount'         => $amount,
            'payment_method' => $request->payment_method,
            'reference'      => $request->reference ?? 'PAY-' . strtoupper(uniqid()),
            'status'         => 'completed',
            'collected_by'   => $accountant->id,
            'paid_at'        => Carbon::now(),
        ]);

        $newPaid    = (float) $invoice->paid + $amount;
        $newBalance = (float) $invoice->total - $newPaid;
        $status     = $newBalance <= 0 ? 'paid' : 'partial';

        $invoice->update([
            'paid'    => $newPaid,
            'balance' => max(0, $newBalance),
            'status'  => $status,
        ]);

        $invoice->refresh();
        $hasCardPurchase = $invoice->items()
            ->where('description', 'like', '%Clinic Card%')
            ->exists();

        if ($hasCardPurchase && $invoice->status === 'paid') {
            $patient = $invoice->patient;
            if ($patient && !$patient->hasActiveCard()) {
                $cardNumber = 'CARD-' . str_pad($patient->id, 6, '0', STR_PAD_LEFT) . '-' . date('Ymd');
                $patient->activateCard($cardNumber);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully.' .
                ($hasCardPurchase && $invoice->status === 'paid' ? ' Clinic card activated.' : ''),
            'data'    => $this->formatInvoice($invoice->fresh(['patient', 'branch'])),
        ]);
    }

    public function exportInvoices(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Export is being generated.']);
    }

    public function getClaims(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $query    = InsuranceClaim::forClinic($clinicId)->with(['patient', 'invoice']);

        if ($request->filled('status') && $request->status !== 'all')
            $query->where('status', $request->status);
        if ($request->filled('provider'))
            $query->where('insurance_provider', $request->provider);

        $claims = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $claims->map(fn($c) => $this->formatClaim($c)),
            'meta'    => [
                'total'        => $claims->total(),
                'current_page' => $claims->currentPage(),
                'last_page'    => $claims->lastPage(),
                'per_page'     => $claims->perPage(),
            ],
        ]);
    }

    public function createClaim(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinicId   = $accountant->clinic_id;

        $request->validate([
            'patient_id'         => 'required|exists:patients,id',
            'invoice_id'         => 'nullable|exists:invoices,id',
            'insurance_provider' => 'required|string|max:255',
            'claim_amount'       => 'required|numeric|min:0',
            'notes'              => 'nullable|string',
        ]);

        $claim = InsuranceClaim::create([
            'clinic_id'          => $clinicId,
            'branch_id'          => $request->branch_id,
            'patient_id'         => $request->patient_id,
            'invoice_id'         => $request->invoice_id,
            'insurance_provider' => $request->insurance_provider,
            'claim_amount'       => $request->claim_amount,
            'status'             => 'draft',
            'notes'              => $request->notes,
            'created_by'         => $accountant->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Claim created successfully.',
            'data'    => $this->formatClaim($claim->fresh(['patient', 'invoice'])),
        ]);
    }

    public function updateClaimStatus(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $request->validate(['status' => 'required|in:draft,submitted,approved,rejected,paid']);
        $claim = InsuranceClaim::forClinic($clinicId)->findOrFail($id);

        $updateData = ['status' => $request->status];
        if ($request->status === 'submitted' && !$claim->submitted_at)
            $updateData['submitted_at'] = Carbon::now();
        if ($request->status === 'approved' && !$claim->approved_at)
            $updateData['approved_at'] = Carbon::now();

        $claim->update($updateData);
        return response()->json(['success' => true, 'message' => 'Claim status updated.', 'data' => $this->formatClaim($claim->fresh())]);
    }

    public function uploadClaimDocument(Request $request, int $id): JsonResponse
    {
        $request->validate(['document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120']);
        return response()->json(['success' => true, 'message' => 'Document uploaded successfully.']);
    }

    public function getTaxes(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $query    = Tax::forClinic($clinicId);
        if ($request->filled('status') && $request->status !== 'all')
            $query->where('status', $request->status);
        $taxes = $query->orderBy('due_date')->get();
        return response()->json(['success' => true, 'data' => $taxes->map(fn($t) => $this->formatTax($t))]);
    }

    public function payTax(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $tax      = Tax::forClinic($clinicId)->findOrFail($id);
        if ($tax->status === 'paid')
            return response()->json(['success' => false, 'message' => 'Tax already paid.'], 422);
        $tax->update(['status' => 'paid', 'paid_at' => Carbon::now()]);
        return response()->json(['success' => true, 'message' => 'Tax payment recorded.', 'data' => $this->formatTax($tax)]);
    }

    private function formatInvoice(Invoice $invoice): array
    {
        return [
            'id'             => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'patient_name'   => $invoice->patient?->full_name ?? '—',
            'patient_id'     => $invoice->patient_id,
            'branch_name'    => $invoice->branch?->name ?? '—',
            'issued_at'      => $invoice->issued_at?->toDateString(),
            'due_date'       => $invoice->due_date?->toDateString(),
            'total'          => (float) $invoice->total,
            'paid_amount'    => (float) $invoice->paid,
            'balance_due'    => (float) $invoice->balance,
            'status'         => $invoice->status,
        ];
    }

    private function formatClaim(InsuranceClaim $claim): array
    {
        return [
            'id'                 => $claim->id,
            'patient_name'       => $claim->patient?->full_name ?? '—',
            'patient_id'         => $claim->patient_id,
            'invoice_id'         => $claim->invoice_id,
            'invoice_number'     => $claim->invoice?->invoice_number,
            'insurance_provider' => $claim->insurance_provider,
            'claim_amount'       => (float) $claim->claim_amount,
            'status'             => $claim->status,
            'submitted_at'       => $claim->submitted_at?->toDateString(),
            'approved_at'        => $claim->approved_at?->toDateString(),
            'notes'              => $claim->notes,
        ];
    }

    private function formatTax(Tax $tax): array
    {
        return [
            'id'       => $tax->id,
            'name'     => $tax->name,
            'rate'     => $tax->rate ?? null,
            'amount'   => (float) $tax->amount,
            'due_date' => $tax->due_date?->toDateString(),
            'status'   => $tax->status,
        ];
    }
}
<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Helpers\EthiopianTime;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * InvoicePdfController — generates a printable invoice as HTML.
 *
 * Returns an HTML page styled for print.
 * The frontend can use window.print() or a headless browser to produce PDF.
 *
 * Why HTML not PDF library:
 *   - No external Composer dependencies needed
 *   - Works on any PHP hosting
 *   - Browser print dialog gives clinic full control over paper size
 *   - Can be upgraded to wkhtmltopdf/DomPDF later without changing the template
 *
 * Accessible at:
 *   GET /api/v1/receptionist/invoices/{id}/pdf
 *   GET /api/v1/accountant/invoices/{id}/pdf
 */
class InvoicePdfController extends Controller
{
    public function download(Request $request, int $id): Response
    {
        $user = $request->user();

        // Scope check — must belong to this clinic and must NOT be DRAFT
        $invoice = Invoice::where('clinic_id', $user->clinic_id)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->with([
                'patient',
                'items',
                'payments',
                'clinic',
                'branch',
                'appointment.dentist',
            ])
            ->findOrFail($id);

        $html = $this->buildHtml($invoice);

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('X-Invoice-Number', $invoice->invoice_number);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function buildHtml(Invoice $invoice): string
    {
        $clinic      = $invoice->clinic;
        $patient     = $invoice->patient;
        $branch      = $invoice->branch;
        $dentistName = $invoice->appointment?->dentist?->name ?? '—';
        $items       = $invoice->items;
        $payments    = $invoice->payments->where('status', 'completed');

        $issuedAt  = $invoice->issued_at?->format('d M Y') ?? now()->format('d M Y');
        $dueDate   = $invoice->due_date?->format('d M Y') ?? '—';
        $status    = strtoupper($invoice->lifecycle_status ?? $invoice->status);

        // Status badge colour
        $statusColor = match(strtolower($invoice->status)) {
            'paid'     => '#16a34a',
            'partial'  => '#d97706',
            'overdue'  => '#dc2626',
            default    => '#2563eb',
        };

        // Items rows
        $itemRows = '';
        foreach ($items as $item) {
            $lineTotal = number_format($item->total, 2);
            $unitPrice = number_format($item->unit_price, 2);
            $discount  = (float)($item->discount ?? 0) > 0
                ? '<br><small style="color:#dc2626">Discount: -ETB ' . number_format($item->discount, 2) . '</small>'
                : '';
            $itemRows .= "
            <tr>
                <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;'>{$item->description}{$discount}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;'>{$item->quantity}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;'>ETB {$unitPrice}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;'>ETB {$lineTotal}</td>
            </tr>";
        }

        // Payment rows
        $paymentRows = '';
        foreach ($payments as $p) {
            $paymentRows .= "
            <tr>
                <td style='padding:4px 0;'>{$p->paid_at?->format('d M Y')}</td>
                <td style='padding:4px 0;text-transform:capitalize;'>{$p->method}</td>
                <td style='padding:4px 0;font-family:monospace;'>{$p->reference}</td>
                <td style='padding:4px 0;text-align:right;font-weight:600;'>ETB " . number_format($p->amount, 2) . "</td>
            </tr>";
        }
        if (!$paymentRows) {
            $paymentRows = "<tr><td colspan='4' style='padding:4px 0;color:#6b7280;font-style:italic;'>No payments recorded</td></tr>";
        }

        $subtotal    = number_format($items->sum(fn($i) => $i->quantity * $i->unit_price), 2);
        $discount    = number_format((float)($invoice->discount_total ?? 0), 2);
        $insurance   = number_format((float)($invoice->insurance_coverage ?? 0), 2);
        $taxRate     = (float)($invoice->tax_rate ?? 15);
        $taxAmount   = number_format((float)($invoice->tax_amount ?? 0), 2);
        $total       = number_format((float)$invoice->total, 2);
        $paid        = number_format((float)$invoice->paid, 2);
        $balance     = number_format((float)$invoice->balance, 2);

        $clinicName  = e($clinic?->name ?? 'DentFlow Clinic');
        $clinicPhone = e($clinic?->phone ?? '—');
        $clinicEmail = e($clinic?->email ?? '—');
        $clinicAddr  = e($clinic?->address ?? ($clinic?->city ?? ''));
        $branchName  = e($branch?->name ?? '');

        $patientName  = e($patient?->full_name ?? '—');
        $patientPhone = e($patient?->phone ?? '—');
        $patientEmail = e($patient?->email ?? '');

        $invoiceNumber = e($invoice->invoice_number);
        $invoiceType   = ucfirst($invoice->invoice_type ?? 'service');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {$invoiceNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size:13px; color:#111827; background:#fff; }
  .page { max-width:800px; margin:0 auto; padding:40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .clinic-name { font-size:22px; font-weight:700; color:#1e3a5f; }
  .clinic-sub { font-size:12px; color:#6b7280; margin-top:4px; }
  .invoice-badge { text-align:right; }
  .invoice-badge h1 { font-size:28px; font-weight:800; color:#1e3a5f; letter-spacing:2px; }
  .invoice-badge .number { font-size:14px; color:#374151; margin-top:4px; }
  .status-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; color:#fff; background:{$statusColor}; margin-top:6px; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; padding:20px; background:#f8fafc; border-radius:8px; }
  .meta-section h3 { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:8px; }
  .meta-section p { font-size:13px; color:#111827; line-height:1.6; }
  .dates-row { display:flex; gap:32px; margin-bottom:24px; }
  .date-item { }
  .date-item label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; display:block; margin-bottom:2px; }
  .date-item span { font-size:13px; font-weight:600; color:#111827; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  thead th { background:#1e3a5f; color:#fff; padding:10px 12px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
  thead th:last-child { text-align:right; }
  thead th:nth-child(2), thead th:nth-child(3) { text-align:center; }
  .totals-box { margin-left:auto; width:280px; }
  .totals-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; }
  .totals-row.total { border-top:2px solid #1e3a5f; margin-top:6px; padding-top:8px; font-weight:700; font-size:15px; color:#1e3a5f; }
  .totals-row.balance { color:{$statusColor}; font-weight:700; font-size:16px; }
  .payments-section { margin-top:24px; }
  .payments-section h3 { font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:8px; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af; }
  @media print {
    body { font-size:12px; }
    .page { padding:20px; max-width:100%; }
    @page { margin:15mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="clinic-name">{$clinicName}</div>
      <div class="clinic-sub">{$branchName}</div>
      <div class="clinic-sub">{$clinicAddr}</div>
      <div class="clinic-sub">{$clinicPhone} · {$clinicEmail}</div>
    </div>
    <div class="invoice-badge">
      <h1>INVOICE</h1>
      <div class="number">{$invoiceNumber}</div>
      <div class="number">{$invoiceType} Invoice</div>
      <span class="status-pill">{$status}</span>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-section">
      <h3>Bill To</h3>
      <p><strong>{$patientName}</strong><br>{$patientPhone}<br>{$patientEmail}</p>
    </div>
    <div class="meta-section">
      <h3>Provider</h3>
      <p>{$clinicName}<br>{$branchName}<br>Dr. {$dentistName}</p>
    </div>
  </div>

  <!-- Dates -->
  <div class="dates-row">
    <div class="date-item">
      <label>Issue Date</label>
      <span>{$issuedAt}</span>
    </div>
    <div class="date-item">
      <label>Due Date</label>
      <span>{$dueDate}</span>
    </div>
    <div class="date-item">
      <label>Invoice #</label>
      <span>{$invoiceNumber}</span>
    </div>
  </div>

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:center;">Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {$itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>ETB {$subtotal}</span></div>
      {$this->discountRow($discount)}
      {$this->insuranceRow($insurance)}
      <div class="totals-row"><span>Tax ({$taxRate}%)</span><span>ETB {$taxAmount}</span></div>
      <div class="totals-row total"><span>TOTAL</span><span>ETB {$total}</span></div>
      <div class="totals-row"><span>Paid</span><span>ETB {$paid}</span></div>
      <div class="totals-row balance"><span>BALANCE DUE</span><span>ETB {$balance}</span></div>
    </div>
  </div>

  <!-- Payments -->
  <div class="payments-section">
    <h3>Payment History</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Method</th>
          <th>Reference</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {$paymentRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for choosing {$clinicName}.</p>
    <p style="margin-top:4px;">This is a computer-generated invoice. For queries contact {$clinicPhone}.</p>
  </div>

</div>
</body>
</html>
HTML;
    }

    private function discountRow(string $discount): string
    {
        if ((float) str_replace(',', '', $discount) <= 0) return '';
        return "<div class='totals-row' style='color:#dc2626;'><span>Discount</span><span>-ETB {$discount}</span></div>";
    }

    private function insuranceRow(string $insurance): string
    {
        if ((float) str_replace(',', '', $insurance) <= 0) return '';
        return "<div class='totals-row' style='color:#16a34a;'><span>Insurance Coverage</span><span>-ETB {$insurance}</span></div>";
    }
}

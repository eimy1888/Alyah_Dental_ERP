<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Payment Confirmed</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;}
    .wrap{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
    .header{background:linear-gradient(135deg,#16a34a,#22c55e);padding:40px 32px;text-align:center;}
    .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;color:#bbf7d0;font-size:13px;text-transform:uppercase;letter-spacing:1px;}
    .body{padding:36px 32px;}
    .text{font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;}
    .info-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;}
    .info-box p{margin:0 0 8px;font-size:13px;color:#15803d;}
    .info-box p:last-child{margin:0;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>✅ DentFlow Pro</h1>
    <p>Payment Confirmed</p>
  </div>
  <div class="body">
    <p class="text"><strong>Hello, {{ $invoice->patient?->full_name ?? 'Patient' }}!</strong></p>
    <p class="text">Your payment has been confirmed and your treatment is now active.</p>
    <div class="info-box">
      <p>🧾 Invoice: <strong>{{ $invoice->invoice_number }}</strong></p>
      <p>💰 Amount Paid: <strong>ETB {{ number_format((float)$invoice->total, 2) }}</strong></p>
      <p>📅 Date: <strong>{{ now()->format('d M Y') }}</strong></p>
      <p>🏥 Clinic: <strong>{{ $invoice->clinic?->name ?? '—' }}</strong></p>
    </div>
    <p class="text">
      Please return to your dentist to continue with your treatment.
      Thank you for choosing us for your dental care.
    </p>
    <p class="text" style="margin-bottom:0;">
      — {{ $invoice->clinic?->name ?? 'DentFlow Pro' }}
    </p>
  </div>
  <div class="footer">© {{ date('Y') }} DentFlow Pro · All rights reserved</div>
</div>
</body>
</html>

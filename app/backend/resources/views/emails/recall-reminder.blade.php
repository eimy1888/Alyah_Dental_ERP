<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Recall Reminder</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;}
    .wrap{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
    .header{background:linear-gradient(135deg,#2563eb,#3b82f6);padding:40px 32px;text-align:center;}
    .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;color:#bfdbfe;font-size:13px;text-transform:uppercase;letter-spacing:1px;}
    .body{padding:36px 32px;}
    .text{font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;}
    .info-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:24px;}
    .info-box p{margin:0 0 8px;font-size:13px;color:#1e40af;}
    .info-box p:last-child{margin:0;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🦷 DentFlow Pro</h1>
    <p>Dental Recall Reminder</p>
  </div>
  <div class="body">
    <p class="text"><strong>Hello!</strong></p>
    <p class="text">
      It's time for your dental recall appointment at
      <strong>{{ $recall->patient?->clinic?->name ?? 'your dental clinic' }}</strong>.
    </p>
    <div class="info-box">
      <p>📅 Due Date: <strong>{{ $recall->due_date?->format('d M Y') }}</strong></p>
      <p>🦷 Dentist: <strong>Dr. {{ $recall->dentist?->name ?? '—' }}</strong></p>
      @if($recall->notes)
        <p>📝 Note: {{ $recall->notes }}</p>
      @endif
    </div>
    <p class="text">
      Please contact us to schedule your appointment at your earliest convenience.
      Keeping up with regular dental check-ups helps maintain your oral health.
    </p>
    <p class="text" style="margin-bottom:0;">
      — {{ $recall->patient?->clinic?->name ?? 'Your Dental Clinic' }}
    </p>
  </div>
  <div class="footer">© {{ date('Y') }} DentFlow Pro · All rights reserved</div>
</div>
</body>
</html>

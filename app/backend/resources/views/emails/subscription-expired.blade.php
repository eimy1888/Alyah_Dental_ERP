<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Subscription Expired</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;}
    .wrap{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
    .header{background:linear-gradient(135deg,#dc2626,#ef4444);padding:40px 32px;text-align:center;}
    .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;color:#fecaca;font-size:13px;text-transform:uppercase;letter-spacing:1px;}
    .body{padding:36px 32px;}
    .greeting{font-size:16px;font-weight:600;color:#1e293b;margin-bottom:12px;}
    .text{font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;}
    .alert-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:24px;}
    .alert-box p{margin:0;font-size:14px;color:#991b1b;font-weight:600;}
    .btn-wrap{text-align:center;margin-bottom:28px;}
    .btn{display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:14px;font-weight:600;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🔴 DentFlow Pro</h1>
    <p>Subscription Expired</p>
  </div>
  <div class="body">
    <p class="greeting">Hello, {{ $admin->name }}!</p>
    <p class="text">
      Your <strong>{{ $subscription->plan?->name }}</strong> subscription for
      <strong>{{ $clinic->name }}</strong> has expired and clinic access has been suspended.
    </p>
    <div class="alert-box">
      <p>❌ Access suspended — {{ $subscription->ends_at?->format('d M Y') }}</p>
    </div>
    <p class="text">
      Please contact your platform administrator immediately to renew your
      subscription and restore access to your clinic.
    </p>
    <div class="btn-wrap">
      <a href="mailto:{{ config('app.saas_support_email','support@dentflowpro.com') }}" class="btn">Renew Now</a>
    </div>
    <p class="text" style="margin-bottom:0;">— The DentFlow Pro Team</p>
  </div>
  <div class="footer">© {{ date('Y') }} DentFlow Pro · All rights reserved</div>
</div>
</body>
</html>

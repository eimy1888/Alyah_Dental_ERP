<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Reset Your Password</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;}
    .wrap{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
    .header{background:linear-gradient(135deg,#1e40af,#2563eb);padding:40px 32px;text-align:center;}
    .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;color:#bfdbfe;font-size:13px;text-transform:uppercase;letter-spacing:1px;}
    .body{padding:36px 32px;}
    .text{font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;}
    .btn-wrap{text-align:center;margin-bottom:28px;}
    .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;}
    .warning{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;margin-bottom:24px;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🦷 DentFlow Pro</h1>
    <p>Password Reset Request</p>
  </div>
  <div class="body">
    <p class="text">You are receiving this email because a password reset was requested for your account.</p>
    <div class="btn-wrap">
      <a href="{{ $actionUrl }}" class="btn">Reset Password →</a>
    </div>
    <div class="warning">
      ⚠️ This link expires in {{ $count }} {{ Str::plural('minute', $count) }}.
      If you did not request a password reset, no action is required.
    </div>
    <p class="text" style="margin-bottom:0;">— The DentFlow Pro Team</p>
  </div>
  <div class="footer">© {{ date('Y') }} DentFlow Pro · All rights reserved</div>
</div>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Alyah Dental ERP</title>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #1e40af, #2563eb); padding: 40px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .header p { margin: 6px 0 0; color: #bfdbfe; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
    .text { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px; }
    .creds-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
    .creds-box p { margin: 0 0 10px; font-size: 13px; color: #64748b; }
    .creds-box p:last-child { margin-bottom: 0; }
    .creds-box span { display: inline-block; font-weight: 700; color: #1e293b; font-size: 15px; font-family: monospace; background: #e0f2fe; padding: 2px 8px; border-radius: 6px; }
    .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-bottom: 28px; }
    .btn-wrap { text-align: center; margin-bottom: 28px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Header -->
    <div class="header">
      <h1>🦷 Alyah Dental ERP</h1>
      <p>Your clinic has been approved</p>
    </div>

    <!-- Body -->
    <div class="body">

      <p class="greeting">Welcome, {{ $admin->name }}!</p>

      <p class="text">
        Congratulations — <strong>{{ $clinic->name }}</strong> has been reviewed and
        approved on the Alyah Dental ERP platform. Your clinic is now live and ready to use.
      </p>

      <!-- Login credentials -->
      <div class="creds-box">
        <p>📧 Email &nbsp;<span>{{ $admin->email }}</span></p>
        <p>🔑 Temporary Password &nbsp;<span>{{ $tempPassword }}</span></p>
      </div>

      <!-- Warning -->
      <div class="warning">
        ⚠️ Please log in and change your password immediately. Do not share these credentials with anyone.
      </div>

      <!-- CTA -->
      <div class="btn-wrap">
        <a href="{{ config('app.url') }}/login" class="btn">Log In to Your Dashboard →</a>
      </div>

      <p class="text">
        If you have any questions, reply to this email or contact our support team.
        We're excited to have you on board!
      </p>

      <p class="text" style="margin-bottom:0;">
        — The Alyah Dental ERP Team
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      © {{ date('Y') }} Alyah Dental ERP · All rights reserved<br/>
      {{ $clinic->city }}, {{ $clinic->country }}
    </div>

  </div>
</body>
</html>
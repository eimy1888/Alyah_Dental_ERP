<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

/**
 * SMTP health check for platform admins.
 * POST /api/v1/platform/mail/test
 */
class MailHealthController extends Controller
{
    public function test(Request $request): JsonResponse
    {
        $request->validate([
            'to' => 'required|email',
        ]);

        $to      = $request->input('to');
        $admin   = $request->user();
        $started = microtime(true);

        try {
            Mail::raw(
                "This is a test email from DentFlow Pro.\n\n" .
                "Sent by: {$admin->name}\n" .
                "Time: " . now()->format('d M Y H:i:s T') . "\n\n" .
                "If you received this, SMTP is configured correctly.",
                function ($msg) use ($to) {
                    $msg->to($to)
                        ->subject('DentFlow Pro — SMTP Test Email');
                }
            );

            $elapsed = round((microtime(true) - $started) * 1000);

            Log::info('[MailHealth] Test email sent', [
                'to'         => $to,
                'sent_by'    => $admin->id,
                'elapsed_ms' => $elapsed,
            ]);

            return response()->json([
                'success'    => true,
                'message'    => "Test email sent to {$to} in {$elapsed}ms.",
                'mailer'     => config('mail.default'),
                'host'       => config('mail.mailers.smtp.host'),
                'port'       => config('mail.mailers.smtp.port'),
                'from'       => config('mail.from.address'),
                'elapsed_ms' => $elapsed,
            ]);

        } catch (\Throwable $e) {
            Log::error('[MailHealth] Test email failed', [
                'to'    => $to,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'SMTP test failed: ' . $e->getMessage(),
                'mailer'  => config('mail.default'),
                'host'    => config('mail.mailers.smtp.host'),
                'port'    => config('mail.mailers.smtp.port'),
            ], 500);
        }
    }

    public function config(Request $request): JsonResponse
    {
        // Returns non-sensitive SMTP config for diagnostics
        return response()->json([
            'success' => true,
            'data'    => [
                'mailer'      => config('mail.default'),
                'host'        => config('mail.mailers.smtp.host'),
                'port'        => config('mail.mailers.smtp.port'),
                'encryption'  => config('mail.mailers.smtp.encryption'),
                'from_address'=> config('mail.from.address'),
                'from_name'   => config('mail.from.name'),
                'queue'       => config('queue.default'),
            ],
        ]);
    }
}

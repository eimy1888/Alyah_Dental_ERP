<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Log;

class LogFailedMailListener
{
    /**
     * Log every sent mail for delivery audit trail.
     */
    public function handle(MessageSent $event): void
    {
        $message = $event->message;
        $to      = implode(', ', array_keys($message->getTo() ?? []));

        Log::channel('daily')->info('[Mail] Message sent', [
            'to'      => $to,
            'subject' => $message->getSubject(),
            'mailer'  => config('mail.default'),
        ]);
    }
}

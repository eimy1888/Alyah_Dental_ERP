<?php

namespace App\Mail;

use App\Models\Recall;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecallReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Recall $recall) {}

    public function envelope(): Envelope
    {
        $dueDate = $this->recall->due_date?->format('d M Y') ?? '—';
        return new Envelope(
            subject: "🦷 Your dental recall is due — {$dueDate}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.recall-reminder');
    }
}

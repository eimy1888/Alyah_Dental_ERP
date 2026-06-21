<?php

namespace App\Mail;

use App\Models\Clinic;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionExpiringMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Clinic       $clinic,
        public User         $admin,
        public Subscription $subscription,
        public int          $daysRemaining
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⚠️ DentFlow — Subscription expires in {$this->daysRemaining} day(s)",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.subscription-expiring');
    }
}

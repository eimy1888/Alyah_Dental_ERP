<?php

namespace App\Mail;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClinicApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Clinic $clinic,
        public User   $admin,
        public string $tempPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Alyah Dental ERP — Your Clinic is Approved!',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.clinic-approved',
        );
    }
}
<?php

namespace App\Providers;

use App\Events\EpisodeFinalized;
use App\Events\InvoiceLocked;
use App\Events\PaymentRecorded;
use App\Events\ProcedureAdded;
use App\Events\ProcedureRemoved;
use App\Listeners\LogBillingEvent;
use App\Listeners\LogFailedMailListener;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Mail\Events\MessageSent;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        // Billing v2 events
        ProcedureAdded::class => [
            [LogBillingEvent::class, 'handleProcedureAdded'],
        ],
        ProcedureRemoved::class => [
            [LogBillingEvent::class, 'handleProcedureRemoved'],
        ],
        EpisodeFinalized::class => [
            [LogBillingEvent::class, 'handleEpisodeFinalized'],
        ],
        InvoiceLocked::class => [
            [LogBillingEvent::class, 'handleInvoiceLocked'],
        ],
        PaymentRecorded::class => [
            [LogBillingEvent::class, 'handlePaymentRecorded'],
        ],
        // Mail audit trail
        MessageSent::class => [
            LogFailedMailListener::class,
        ],
    ];

    public function boot(): void {}

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}

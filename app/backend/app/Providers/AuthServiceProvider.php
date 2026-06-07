<?php
// app/Providers/AuthServiceProvider.php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Policies\ReceptionistPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Patient::class     => ReceptionistPolicy::class,
        Appointment::class => ReceptionistPolicy::class,
        Invoice::class     => ReceptionistPolicy::class,
        Payment::class     => ReceptionistPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
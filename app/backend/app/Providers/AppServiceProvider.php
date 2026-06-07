<?php

namespace App\Providers;

use App\Services\BillingCalculatorService;
use App\Services\BillingModelResolver;
use App\Services\InvoiceLifecycleService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind billing services as singletons so they're shared per request
        $this->app->singleton(BillingCalculatorService::class);
        $this->app->singleton(BillingModelResolver::class);
        $this->app->singleton(InvoiceLifecycleService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force PHP runtime timezone to Ethiopian time (EAT = UTC+3).
        // XAMPP ships with Europe/Berlin in php.ini which is UTC+2 and
        // causes all Carbon datetime formatting to be 1 hour behind EAT.
        // This override wins regardless of php.ini.
        $tz = config('app.timezone', 'Africa/Addis_Ababa');
        date_default_timezone_set($tz);
        \Carbon\Carbon::setLocale('en');
    }
}

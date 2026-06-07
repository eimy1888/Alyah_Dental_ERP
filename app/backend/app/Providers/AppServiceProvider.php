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
        //
    }
}

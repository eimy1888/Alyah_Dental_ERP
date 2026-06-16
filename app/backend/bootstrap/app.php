<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // CORS must run before everything
        $middleware->prepend(
            \Illuminate\Http\Middleware\HandleCors::class
        );

        // Sanctum stateful for cookie auth
        $middleware->statefulApi();

        // Middleware aliases
        $middleware->alias([
            'role'             => \App\Http\Middleware\CheckRole::class,
            'cookie.auth'      => \App\Http\Middleware\AuthenticateFromCookie::class,
            'subdomain.access' => \App\Http\Middleware\CheckSubdomainAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
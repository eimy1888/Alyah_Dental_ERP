<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        // Already authenticated via Bearer header (API clients) — let it pass
        if ($request->user('sanctum')) {
            auth()->setUser($request->user('sanctum'));
            return $next($request);
        }

        // Read token from HttpOnly cookie
        $token = $request->cookie('dentflow_token');

        if (! $token) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Cookie is already decrypted by Laravel's EncryptCookies middleware
        $pat = PersonalAccessToken::findToken($token);

        if (! $pat || ! $pat->tokenable) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Set the authenticated user for this request
        auth()->setUser($pat->tokenable);

        return $next($request);
    }
}
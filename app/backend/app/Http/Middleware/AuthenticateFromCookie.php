<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateFromCookie
{
    private const PASSWORD_CHANGE_ALLOWED_PATHS = [
        'api/v1/auth/change-password',
        'api/v1/auth/logout',
        'api/v1/auth/me',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($bearerToken = $request->bearerToken()) {
            $pat = PersonalAccessToken::findToken($bearerToken);

            if (! $pat || ! $pat->tokenable || $this->tokenExpired($pat)) {
                $pat?->delete();

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401)->withoutCookie('dentflow_token');
            }

            $user = $pat->tokenable->withAccessToken($pat);
            auth()->setUser($user);
            $request->setUserResolver(fn () => $user);

            if ($response = $this->blockPendingPasswordChange($request, $user)) {
                return $response;
            }

            return $next($request);
        }

        $token = $request->cookie('dentflow_token');

        if (! $token) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $pat = PersonalAccessToken::findToken($token);

        if (! $pat || ! $pat->tokenable || $this->tokenExpired($pat)) {
            $pat?->delete();

            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401)->withoutCookie('dentflow_token');
        }

        $user = $pat->tokenable->withAccessToken($pat);
        auth()->setUser($user);
        $request->setUserResolver(fn () => $user);

        if ($response = $this->blockPendingPasswordChange($request, $user)) {
            return $response;
        }

        return $next($request);
    }

    private function tokenExpired($token): bool
    {
        return $token?->expires_at && $token->expires_at->isPast();
    }

    private function blockPendingPasswordChange(Request $request, $user): ?Response
    {
        if (! $user->must_change_password) {
            return null;
        }

        if (in_array($request->path(), self::PASSWORD_CHANGE_ALLOWED_PATHS, true)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Password change required before continuing.',
            'code' => 'MUST_CHANGE_PASSWORD',
            'redirect_to' => '/change-password',
        ], 403);
    }
}

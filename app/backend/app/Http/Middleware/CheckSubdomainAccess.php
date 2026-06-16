<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Subscription;

/**
 * Enforces per-request subdomain access checks for all clinic-scoped routes.
 * Platform admins bypass this check entirely.
 * Public/landing routes are not covered by this middleware.
 */
class CheckSubdomainAccess
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        // No user or platform admin — bypass completely
        if (!$user || $user->role === 'platform_admin') {
            return $next($request);
        }

        // Resolve the clinic for this user
        $clinic = $user->clinic;

        if (!$clinic) {
            return response()->json([
                'success' => false,
                'code'    => 'NO_CLINIC',
                'message' => 'No clinic associated with this account.',
            ], 403);
        }

        // Check manual subdomain suspension
        if (!$clinic->subdomain_active) {
            return response()->json([
                'success' => false,
                'code'    => 'SUBDOMAIN_SUSPENDED',
                'message' => 'This clinic\'s subdomain has been suspended by the platform administrator.',
            ], 403);
        }

        // Check clinic status
        if ($clinic->status === 'suspended') {
            return response()->json([
                'success' => false,
                'code'    => 'CLINIC_SUSPENDED',
                'message' => 'This clinic account has been suspended.',
            ], 403);
        }

        // Check active subscription
        $activeSubscription = Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->exists();

        if (!$activeSubscription) {
            // Check if there's an expired subscription (more specific message)
            $hasExpired = Subscription::where('clinic_id', $clinic->id)
                ->where('status', 'expired')
                ->exists();

            return response()->json([
                'success' => false,
                'code'    => 'SUBSCRIPTION_EXPIRED',
                'message' => $hasExpired
                    ? 'Your subscription has expired. Please contact the platform administrator to renew.'
                    : 'No active subscription found. Please contact the platform administrator.',
            ], 403);
        }

        return $next($request);
    }
}

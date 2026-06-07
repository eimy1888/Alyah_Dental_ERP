<?php

namespace App\Http\Controllers\Api\V1\Landing;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    /**
     * GET /api/v1/plans
     * List all active plans for the landing / registration page.
     */
    public function index(): JsonResponse
    {
        $plans = Plan::active()
            ->orderBy('monthly_price')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $plans,
        ]);
    }

    /**
     * GET /api/v1/plans/{plan}
     * Get a single plan's details.
     */
    public function show(Plan $plan): JsonResponse
    {
        if (! $plan->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $plan,
        ]);
    }
}
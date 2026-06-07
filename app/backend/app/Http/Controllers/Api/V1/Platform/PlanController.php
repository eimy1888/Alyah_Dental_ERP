<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    /**
     * GET /api/v1/platform/plans
     * List all plans (active and inactive) for platform admin.
     */
    public function index(): JsonResponse
    {
        $plans = Plan::orderBy('monthly_price')->get();

        return response()->json([
            'success' => true,
            'data'    => $plans->map(fn($p) => $this->formatPlan($p)),
        ]);
    }

    /**
     * POST /api/v1/platform/plans
     * Create a new plan.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'slug'           => ['nullable', 'string', 'max:50', 'unique:plans,slug'],
            'monthly_price'  => ['required', 'numeric', 'min:0'],
            'annual_price'   => ['required', 'numeric', 'min:0'],
            'max_users'      => ['required', 'integer', 'min:1'],
            'max_branches'   => ['required', 'integer', 'min:1'],
            'max_storage_gb' => ['required', 'integer', 'min:1'],
            'features'       => ['nullable', 'array'],
            'features.*'     => ['string', 'max:200'],
            'is_active'      => ['boolean'],
        ]);

        // Auto-generate slug from name if not provided
      // Replace the slug generation block in store() with this:
            if (empty($validated['slug'])) {
                $base = \Illuminate\Support\Str::slug($validated['name']);
                $slug = $base;
                $i = 2;
                while (\App\Models\Plan::where('slug', $slug)->exists()) {
                    $slug = $base . '-' . $i++;
                }
                $validated['slug'] = $slug;
            }
        $plan = Plan::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' created successfully.",
            'data'    => $this->formatPlan($plan),
        ], 201);
    }

    /**
     * PUT /api/v1/platform/plans/{plan}
     * Update an existing plan.
     */
    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['sometimes', 'string', 'max:100'],
            'monthly_price'  => ['sometimes', 'numeric', 'min:0'],
            'annual_price'   => ['sometimes', 'numeric', 'min:0'],
            'max_users'      => ['sometimes', 'integer', 'min:1'],
            'max_branches'   => ['sometimes', 'integer', 'min:1'],
            'max_storage_gb' => ['sometimes', 'integer', 'min:1'],
            'features'       => ['nullable', 'array'],
            'features.*'     => ['string', 'max:200'],
            'is_active'      => ['boolean'],
        ]);

        $plan->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' updated successfully.",
            'data'    => $this->formatPlan($plan->fresh()),
        ]);
    }

    /**
     * DELETE /api/v1/platform/plans/{plan}
     * Soft-delete a plan — only if no active subscriptions use it.
     */
    public function destroy(Plan $plan): JsonResponse
    {
        // Guard: cannot delete plan with active subscriptions
        $activeCount = $plan->subscriptions()
            ->where('status', 'active')
            ->count();

        if ($activeCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete '{$plan->name}' — {$activeCount} active subscription(s) use this plan.",
            ], 422);
        }

        $plan->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' has been deactivated.",
        ]);
    }

    // ── Private helper ────────────────────────────────────────────────────────
    private function formatPlan(Plan $plan): array
    {
        return [
            'id'             => $plan->id,
            'name'           => $plan->name,
            'slug'           => $plan->slug,
            'monthly_price'  => (float) $plan->monthly_price,
            'annual_price'   => (float) $plan->annual_price,
            'max_users'      => $plan->max_users,
            'max_branches'   => $plan->max_branches,
            'max_storage_gb' => $plan->max_storage_gb,
            'features'       => $plan->features ?? [],
            'is_active'      => (bool) $plan->is_active,
            'created_at'     => $plan->created_at->format('d M Y'),
        ];
    }
}
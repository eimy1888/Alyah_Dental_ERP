<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Clinic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    // ── List ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/platform/plans
     */
    public function index(): JsonResponse
    {
        $plans = Plan::orderBy('monthly_price')->get();

        return response()->json([
            'success' => true,
            'data'    => $plans->map(fn($p) => $this->formatPlan($p)),
        ]);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/plans
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:100', 'unique:plans,name'],
            'slug'           => ['nullable', 'string', 'max:50', 'unique:plans,slug'],
            'type'           => ['required', Rule::in(['free', 'paid'])],

            // Free plan fields
            'duration_days'  => ['required_if:type,free', 'nullable', 'integer', 'min:1', 'max:3650'],

            // Paid plan fields
            'duration_value' => ['required_if:type,paid', 'nullable', 'integer', 'min:1', 'max:3650'],
            'duration_unit'  => ['required_if:type,paid', 'nullable', Rule::in(['days', 'months', 'years'])],
            'monthly_price'  => ['required_if:type,paid', 'nullable', 'numeric', 'min:0.01', 'max:999999.99'],
            'annual_price'   => ['required_if:type,paid', 'nullable', 'numeric', 'min:0.01', 'max:999999.99'],

            'max_users'      => ['required', 'integer', 'min:1'],
            'max_branches'   => ['required', 'integer', 'min:1'],
            'max_storage_gb' => ['required', 'integer', 'min:1'],
            'features'       => ['nullable', 'array'],
            'features.*'     => ['string', 'max:200'],
            'is_active'      => ['boolean'],
        ]);

        // Free plans must NOT have pricing
        if ($validated['type'] === 'free') {
            if (!empty($validated['monthly_price']) || !empty($validated['annual_price'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Free plans cannot have a monetary amount or annual price.',
                    'errors'  => ['type' => ['Free plans cannot have monetary amounts.']],
                ], 422);
            }
            $validated['monthly_price'] = null;
            $validated['annual_price']  = null;
            $validated['duration_value'] = null;
            $validated['duration_unit']  = null;
        }

        // Paid plans must NOT use duration_days
        if ($validated['type'] === 'paid') {
            $validated['duration_days'] = null;
        }

        // Auto-generate slug
        if (empty($validated['slug'])) {
            $base = Str::slug($validated['name']);
            $slug = $base;
            $i = 2;
            while (Plan::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $validated['slug'] = $slug;
        }

        $validated['is_active'] = $validated['is_active'] ?? true;

        $plan = Plan::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' created successfully.",
            'data'    => $this->formatPlan($plan),
        ], 201);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/platform/plans/{plan}
     */
    public function show(Plan $plan): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->formatPlan($plan),
        ]);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/platform/plans/{plan}
     */
    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['sometimes', 'string', 'max:100', Rule::unique('plans', 'name')->ignore($plan->id)],
            // type is intentionally NOT updatable after creation
            'duration_days'  => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'duration_value' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'duration_unit'  => ['sometimes', 'nullable', Rule::in(['days', 'months', 'years'])],
            'monthly_price'  => ['sometimes', 'nullable', 'numeric', 'min:0.01', 'max:999999.99'],
            'annual_price'   => ['sometimes', 'nullable', 'numeric', 'min:0.01', 'max:999999.99'],
            'max_users'      => ['sometimes', 'integer', 'min:1'],
            'max_branches'   => ['sometimes', 'integer', 'min:1'],
            'max_storage_gb' => ['sometimes', 'integer', 'min:1'],
            'features'       => ['nullable', 'array'],
            'features.*'     => ['string', 'max:200'],
            'is_active'      => ['boolean'],
        ]);

        // Prevent setting prices on free plans
        if ($plan->type === 'free') {
            unset($validated['monthly_price'], $validated['annual_price']);
        }

        // Prevent setting annual_price on free plan via update
        if ($plan->type === 'free' && isset($validated['annual_price'])) {
            return response()->json([
                'success' => false,
                'message' => 'Free plans cannot have an annual price.',
            ], 422);
        }

        $plan->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' updated successfully.",
            'data'    => $this->formatPlan($plan->fresh()),
        ]);
    }

    // ── Delete / Deactivate ───────────────────────────────────────────────────

    /**
     * DELETE /api/v1/platform/plans/{plan}
     * Soft-deactivates a plan. Blocked if active subscriptions exist.
     */
    public function destroy(Plan $plan): JsonResponse
    {
        $activeCount = $plan->subscriptions()
            ->where('status', 'active')
            ->count();

        if ($activeCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete '{$plan->name}' — {$activeCount} active subscription(s) use this plan.",
                'data'    => ['blocking_subscriptions' => $activeCount],
            ], 422);
        }

        $plan->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' has been deactivated.",
        ]);
    }

    // ── Assign plan to clinic ─────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/assign-plan
     */
    public function assignToClinic(Request $request, Clinic $clinic): JsonResponse
    {
        $validated = $request->validate([
            'plan_id'       => ['required', 'exists:plans,id'],
            'billing_cycle' => ['required', Rule::in(['days', 'monthly', 'annual'])],
        ]);

        /** @var Plan $plan */
        $plan = Plan::findOrFail($validated['plan_id']);

        // Plan must be active
        if (!$plan->is_active) {
            return response()->json([
                'success' => false,
                'message' => "Plan '{$plan->name}' is inactive and cannot be assigned.",
            ], 422);
        }

        // Free plans cannot use annual billing
        if ($plan->type === 'free' && $validated['billing_cycle'] === 'annual') {
            return response()->json([
                'success' => false,
                'message' => 'Free plans do not support annual billing cycle.',
                'errors'  => ['billing_cycle' => ['Annual billing is not valid for free plans.']],
            ], 422);
        }

        // Free plans must use 'days' billing cycle
        if ($plan->type === 'free' && $validated['billing_cycle'] !== 'days') {
            return response()->json([
                'success' => false,
                'message' => 'Free plans only support the "days" billing cycle.',
                'errors'  => ['billing_cycle' => ['Only "days" is valid for free plans.']],
            ], 422);
        }

        // Paid plans must use monthly or annual
        if ($plan->type === 'paid' && $validated['billing_cycle'] === 'days') {
            return response()->json([
                'success' => false,
                'message' => 'Paid plans require "monthly" or "annual" billing cycle.',
                'errors'  => ['billing_cycle' => ['Paid plans require monthly or annual billing.']],
            ], 422);
        }

        // Expire any existing active subscription
        Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->update([
                'status'  => 'expired',
                'ends_at' => now(),
            ]);

        $startsAt = now();
        $endsAt   = $plan->calculateEndsAt($validated['billing_cycle']);

        // For free plans: activate immediately. For paid: status = pending until payment recorded.
        $status = $plan->type === 'free' ? 'active' : 'pending';

        $subscription = Subscription::create([
            'clinic_id'     => $clinic->id,
            'plan_id'       => $plan->id,
            'billing_cycle' => $validated['billing_cycle'],
            'amount_paid'   => $plan->type === 'free' ? 0 : $plan->priceFor($validated['billing_cycle']),
            'status'        => $status,
            'starts_at'     => $startsAt,
            'ends_at'       => $endsAt,
        ]);

        // Update clinic plan reference
        $clinicUpdate = ['plan_id' => $plan->id];

        // Enable subdomain access when a free plan is assigned (paid plan: on payment)
        if ($plan->type === 'free') {
            $clinicUpdate['subdomain_active'] = true;
            $clinicUpdate['status']           = 'active';
        }

        $clinic->update($clinicUpdate);

        \App\Models\AuditLog::record('plan.assigned', [
            'subject_type'  => 'Plan',
            'subject_id'    => $plan->id,
            'subject_label' => $plan->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => [
                'plan'          => $plan->name,
                'plan_type'     => $plan->type,
                'billing_cycle' => $validated['billing_cycle'],
                'ends_at'       => $endsAt->toDateString(),
                'status'        => $status,
            ],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Plan '{$plan->name}' assigned to '{$clinic->name}'.",
            'data'    => [
                'subscription_id' => $subscription->id,
                'plan'            => $plan->name,
                'plan_type'       => $plan->type,
                'billing_cycle'   => $subscription->billing_cycle,
                'status'          => $subscription->status,
                'starts_at'       => $subscription->starts_at->format('d M Y'),
                'ends_at'         => $subscription->ends_at->format('d M Y'),
                'days_remaining'  => $subscription->daysRemaining(),
                'amount_due'      => $plan->type === 'paid' ? $plan->priceFor($validated['billing_cycle']) : 0,
            ],
        ]);
    }

    // ── Record Payment ────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/record-payment
     */
    public function recordPayment(Request $request, Clinic $clinic): JsonResponse
    {
        $validated = $request->validate([
            'amount'            => ['required', 'numeric', 'min:0.01'],
            'payment_method'    => ['required', Rule::in(['telebirr', 'chapa', 'paypal', 'bank_transfer', 'cash'])],
            'payment_reference' => ['required', 'string', 'max:200'],
            'payment_date'      => ['required', 'date', 'before_or_equal:today'],
            'billing_cycle'     => ['required', Rule::in(['monthly', 'annual'])],
        ]);

        // Get the pending subscription
        $subscription = Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'pending')
            ->with('plan')
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No pending subscription found for this clinic. Please assign a plan first.',
            ], 422);
        }

        $plan = $subscription->plan;

        // Verify the paid plan type
        if ($plan->type === 'free') {
            return response()->json([
                'success' => false,
                'message' => 'Free plans do not require payment.',
            ], 422);
        }

        $expectedAmount = $plan->priceFor($validated['billing_cycle']);

        // Strict amount match
        if (abs((float) $validated['amount'] - $expectedAmount) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => "Payment amount mismatch. Expected {$expectedAmount} ETB for {$validated['billing_cycle']} billing.",
                'data'    => [
                    'expected_amount' => $expectedAmount,
                    'billing_cycle'   => $validated['billing_cycle'],
                ],
            ], 422);
        }

        $startsAt = now();
        $endsAt   = Subscription::calculateEndsAt($validated['billing_cycle'], $startsAt, $plan);

        $subscription->update([
            'billing_cycle'     => $validated['billing_cycle'],
            'amount_paid'       => $validated['amount'],
            'payment_method'    => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'],
            'payment_date'      => $validated['payment_date'],
            'status'            => 'active',
            'starts_at'         => $startsAt,
            'ends_at'           => $endsAt,
        ]);

        // Enable clinic subdomain and activate
        $clinic->update([
            'subdomain_active' => true,
            'status'           => 'active',
        ]);

        \Illuminate\Support\Facades\Log::info('[DentFlow] Plan payment recorded', [
            'clinic_id'      => $clinic->id,
            'subscription_id'=> $subscription->id,
            'amount'         => $validated['amount'],
            'method'         => $validated['payment_method'],
            'reference'      => $validated['payment_reference'],
            'ends_at'        => $endsAt->toDateTimeString(),
        ]);

        \App\Models\AuditLog::record('subscription.payment_recorded', [
            'subject_type'  => 'Subscription',
            'subject_id'    => $subscription->id,
            'subject_label' => $clinic->name . ' — ' . $subscription->billing_cycle,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => [
                'amount_paid'       => $validated['amount'],
                'payment_method'    => $validated['payment_method'],
                'payment_reference' => $validated['payment_reference'],
                'billing_cycle'     => $validated['billing_cycle'],
                'ends_at'           => $endsAt->toDateString(),
            ],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Payment recorded. '{$clinic->name}' subscription is now active.",
            'data'    => [
                'subscription_id' => $subscription->id,
                'billing_cycle'   => $subscription->billing_cycle,
                'amount_paid'     => (float) $subscription->amount_paid,
                'starts_at'       => $subscription->starts_at->format('d M Y'),
                'ends_at'         => $subscription->ends_at->format('d M Y'),
                'days_remaining'  => $subscription->daysRemaining(),
            ],
        ]);
    }

    // ── Payment History ───────────────────────────────────────────────────────

    /**
     * GET /api/v1/platform/clinics/{clinic}/payment-history
     */
    public function paymentHistory(Clinic $clinic): JsonResponse
    {
        $payments = Subscription::where('clinic_id', $clinic->id)
            ->whereNotNull('payment_reference')
            ->with('plan')
            ->orderByDesc('payment_date')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $payments->map(fn($s) => [
                'id'                => $s->id,
                'plan_name'         => $s->plan?->name,
                'billing_cycle'     => $s->billing_cycle,
                'amount_paid'       => (float) $s->amount_paid,
                'payment_method'    => $s->payment_method,
                'payment_reference' => $s->payment_reference,
                'payment_date'      => $s->payment_date?->format('d M Y'),
                'status'            => $s->status,
                'starts_at'         => $s->starts_at?->format('d M Y'),
                'ends_at'           => $s->ends_at?->format('d M Y'),
            ]),
        ]);
    }

    // ── Private helper ────────────────────────────────────────────────────────

    private function formatPlan(Plan $plan): array
    {
        $data = [
            'id'          => $plan->id,
            'name'        => $plan->name,
            'slug'        => $plan->slug,
            'type'        => $plan->type,
            'features'    => $plan->features ?? [],
            'is_active'   => (bool) $plan->is_active,
            'max_users'      => $plan->max_users,
            'max_branches'   => $plan->max_branches,
            'max_storage_gb' => $plan->max_storage_gb,
            'created_at'  => $plan->created_at->format('d M Y'),
        ];

        if ($plan->type === 'free') {
            $data['duration_days'] = $plan->duration_days;
            $data['monthly_price'] = 0;
            $data['annual_price']  = null;
            $data['annual_billing_available'] = false;
        } else {
            $data['duration_value'] = $plan->duration_value;
            $data['duration_unit']  = $plan->duration_unit;
            $data['monthly_price']  = (float) $plan->monthly_price;
            $data['annual_price']   = (float) $plan->annual_price;
            $data['annual_billing_available'] = true;
        }

        return $data;
    }
}

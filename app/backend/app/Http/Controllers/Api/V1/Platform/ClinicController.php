<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ClinicController extends Controller
{
    // ── List all clinics (with subscription/plan status) ─────────────────────

    /**
     * GET /api/v1/platform/clinics
     */
    public function index(Request $request): JsonResponse
    {
        $query = Clinic::with([
            'plan',
            'activeSubscription',
            'users' => fn($q) => $q->where('role', 'clinic_admin')->select('id', 'clinic_id', 'name', 'email'),
        ])->withCount('users');

        // Search by name, subdomain, or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name',      'like', "%{$search}%")
                  ->orWhere('subdomain','like', "%{$search}%")
                  ->orWhere('email',    'like', "%{$search}%");
            });
        }

        // Filter by subscription status
        if ($request->filled('subscription_status') && $request->subscription_status !== 'all') {
            $subStatus = $request->subscription_status;
            $query->whereHas('subscriptions', fn($q) => $q->where('status', $subStatus));
        }

        // Filter by plan type
        if ($request->filled('plan_type') && $request->plan_type !== 'all') {
            $query->whereHas('plan', fn($q) => $q->where('type', $request->plan_type));
        }

        // Filter by clinic status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $clinics = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $clinics->map(fn($c) => $this->formatClinic($c)),
            'meta' => [
                'total'     => $clinics->count(),
                'active'    => $clinics->where('status', 'active')->count(),
                'pending'   => $clinics->whereIn('status', ['pending_payment', 'pending_platform_approval'])->count(),
                'suspended' => $clinics->where('status', 'suspended')->count(),
            ],
        ]);
    }

    // ── Show single clinic ────────────────────────────────────────────────────

    /**
     * GET /api/v1/platform/clinics/{clinic}
     */
    public function show(Clinic $clinic): JsonResponse
    {
        $clinic->load(['plan', 'activeSubscription', 'branches']);

        return response()->json([
            'success' => true,
            'data'    => array_merge($this->formatClinic($clinic), [
                'branches' => $clinic->branches->map(fn($b) => $this->formatBranch($b)),
            ]),
        ]);
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/approve
     */
    public function approve(Clinic $clinic): JsonResponse
    {
        if ($clinic->status === 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Clinic is already active.',
            ], 422);
        }

        $clinic->update([
            'status'      => 'active',
            'approved_at' => now(),
        ]);

        // Create clinic_admin user if not already exists
        $existingAdmin = User::where('clinic_id', $clinic->id)
            ->where('role', 'clinic_admin')
            ->first();

        $tempPassword = null;

        if (!$existingAdmin) {
            $tempPassword = Str::random(10);

            $clinicAdmin = User::create([
                'clinic_id' => $clinic->id,
                'name'      => $clinic->name . ' Admin',
                'email'     => $clinic->email,
                'phone'     => $clinic->phone,
                'password'  => bcrypt($tempPassword),
                'role'      => 'clinic_admin',
                'is_active' => true,
            ]);

            try {
                \Mail::to($clinic->email)
                    ->send(new \App\Mail\ClinicApprovedMail($clinic, $clinicAdmin, $tempPassword));
            } catch (\Exception $e) {
                Log::error('[DentFlow] Approval email failed', [
                    'clinic_id' => $clinic->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        } else {
            $existingAdmin->update(['is_active' => true]);
        }

        // Create main branch if not exists
        $mainBranchExists = Branch::where('clinic_id', $clinic->id)->exists();

        if (!$mainBranchExists) {
            $clinicSubdomain = $clinic->subdomain ?? Clinic::generateSubdomain($clinic->name);
            $branchSubdomain = Branch::generateSubdomain($clinic->name . ' Main', $clinicSubdomain);

            Branch::create([
                'clinic_id'        => $clinic->id,
                'name'             => $clinic->name . ' — Main Branch',
                'subdomain'        => $branchSubdomain,
                'subdomain_active' => true,
                'location'         => trim(($clinic->address ?? '') . ', ' . ($clinic->city ?? ''), ', '),
                'phone'            => $clinic->phone,
                'email'            => $clinic->email,
                'status'           => 'active',
            ]);
        }

        // Activate pending subscription
        Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'pending')
            ->update([
                'status'    => 'active',
                'starts_at' => now(),
                'ends_at'   => now()->addMonth(),
            ]);

        Log::info('[DentFlow] Clinic approved + main branch created', [
            'clinic_id' => $clinic->id,
            'name'      => $clinic->name,
        ]);

        \App\Models\AuditLog::record('clinic.approved', [
            'subject_type'  => 'Clinic',
            'subject_id'    => $clinic->id,
            'subject_label' => $clinic->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => ['status' => 'active'],
        ], request());

        return response()->json([
            'success'       => true,
            'message'       => "Clinic '{$clinic->name}' approved. Main branch created.",
            'data'          => ['status' => 'active'],
            'temp_password' => $tempPassword,
        ]);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/reject
     */
    public function reject(Request $request, Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'rejected']);

        Log::info('[DentFlow] Clinic rejected', [
            'clinic_id' => $clinic->id,
            'name'      => $clinic->name,
            'reason'    => $request->reason ?? 'No reason provided',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Clinic '{$clinic->name}' has been rejected.",
            'data'    => ['status' => 'rejected'],
        ]);
    }

    // ── Suspend ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/suspend
     */
    public function suspend(Clinic $clinic): JsonResponse
    {
        $clinic->update([
            'status'           => 'suspended',
            'subdomain_active' => false,
        ]);

        // Disable all clinic users
        $clinic->users()->update(['is_active' => false]);

        Log::info('[DentFlow] Clinic manually suspended', [
            'clinic_id' => $clinic->id,
            'name'      => $clinic->name,
        ]);

        \App\Models\AuditLog::record('clinic.suspended', [
            'subject_type'  => 'Clinic',
            'subject_id'    => $clinic->id,
            'subject_label' => $clinic->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => ['status' => 'suspended', 'subdomain_active' => false],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Clinic '{$clinic->name}' has been suspended.",
            'data'    => ['status' => 'suspended', 'subdomain_active' => false],
        ]);
    }

    // ── Reactivate ────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/reactivate
     */
    public function reactivate(Clinic $clinic): JsonResponse
    {
        // Check for a valid (non-expired, non-cancelled) subscription
        $activeSubscription = Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->first();

        $clinic->update([
            'status'           => 'active',
            'subdomain_active' => $activeSubscription ? true : false,
        ]);

        // Restore clinic admin access
        $clinic->users()
            ->where('role', 'clinic_admin')
            ->update(['is_active' => true]);

        $warning = null;
        if (!$activeSubscription) {
            $warning = 'Clinic reactivated but no active subscription found. Subdomain access remains disabled until a valid plan is assigned and paid.';
        }

        Log::info('[DentFlow] Clinic reactivated', [
            'clinic_id'          => $clinic->id,
            'has_subscription'   => (bool) $activeSubscription,
        ]);

        \App\Models\AuditLog::record('clinic.reactivated', [
            'subject_type'  => 'Clinic',
            'subject_id'    => $clinic->id,
            'subject_label' => $clinic->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => ['status' => 'active', 'subdomain_active' => (bool) $activeSubscription],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Clinic '{$clinic->name}' has been reactivated.",
            'data'    => [
                'status'           => 'active',
                'subdomain_active' => (bool) $activeSubscription,
            ],
            'warning' => $warning,
        ]);
    }

    // ── Subdomain Control — Clinic ────────────────────────────────────────────

    /**
     * POST /api/v1/platform/clinics/{clinic}/disable-subdomain
     */
    public function disableSubdomain(Clinic $clinic): JsonResponse
    {
        $clinic->update(['subdomain_active' => false]);

        Log::info('[DentFlow] Clinic subdomain disabled by admin', [
            'clinic_id' => $clinic->id,
        ]);

        \App\Models\AuditLog::record('clinic.subdomain_disabled', [
            'subject_type'  => 'Clinic',
            'subject_id'    => $clinic->id,
            'subject_label' => $clinic->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => ['subdomain_active' => false],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Subdomain for '{$clinic->name}' has been disabled.",
            'data'    => ['subdomain_active' => false],
        ]);
    }

    /**
     * POST /api/v1/platform/clinics/{clinic}/enable-subdomain
     */
    public function enableSubdomain(Clinic $clinic): JsonResponse
    {
        // Warn if no active subscription
        $hasActive = Subscription::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->exists();

        $clinic->update(['subdomain_active' => true]);

        Log::info('[DentFlow] Clinic subdomain enabled by admin', [
            'clinic_id'       => $clinic->id,
            'has_active_plan' => $hasActive,
        ]);

        \App\Models\AuditLog::record('clinic.subdomain_enabled', [
            'subject_type'  => 'Clinic',
            'subject_id'    => $clinic->id,
            'subject_label' => $clinic->name,
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'new_values'    => ['subdomain_active' => true],
        ], request());

        return response()->json([
            'success' => true,
            'message' => "Subdomain for '{$clinic->name}' has been enabled.",
            'data'    => [
                'subdomain_active' => true,
                'warning' => !$hasActive
                    ? 'No active subscription found. Clinic can access subdomain but plan enforcement will still block clinic routes if subscription is expired.'
                    : null,
            ],
        ]);
    }

    // ── Subdomain Control — Branch ────────────────────────────────────────────

    /**
     * POST /api/v1/platform/branches/{branch}/disable-subdomain
     */
    public function disableBranchSubdomain(Branch $branch): JsonResponse
    {
        $branch->update(['subdomain_active' => false]);

        Log::info('[DentFlow] Branch subdomain disabled by admin', [
            'branch_id' => $branch->id,
            'clinic_id' => $branch->clinic_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Subdomain for branch '{$branch->name}' has been disabled.",
            'data'    => ['subdomain_active' => false],
        ]);
    }

    /**
     * POST /api/v1/platform/branches/{branch}/enable-subdomain
     */
    public function enableBranchSubdomain(Branch $branch): JsonResponse
    {
        $branch->update(['subdomain_active' => true]);

        Log::info('[DentFlow] Branch subdomain enabled by admin', [
            'branch_id' => $branch->id,
            'clinic_id' => $branch->clinic_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Subdomain for branch '{$branch->name}' has been enabled.",
            'data'    => ['subdomain_active' => true],
        ]);
    }

    // ── Format helpers ────────────────────────────────────────────────────────

    private function formatClinic(Clinic $clinic): array
    {
        $sub = $clinic->activeSubscription;
        $daysRemaining = $sub ? $sub->daysRemaining() : null;

        return [
            'id'               => $clinic->id,
            'name'             => $clinic->name,
            'email'            => $clinic->email,
            'phone'            => $clinic->phone,
            'city'             => $clinic->city,
            'country'          => $clinic->country,
            'subdomain'        => $clinic->subdomain,
            'subdomain_active' => (bool) $clinic->subdomain_active,
            'status'           => $clinic->status,
            'plan'             => $clinic->plan?->name,
            'plan_type'        => $clinic->plan?->type,
            'plan_id'          => $clinic->plan_id,
            'subscription_status' => $sub?->status,
            'subscription_ends_at'=> $sub?->ends_at?->format('d M Y'),
            'days_remaining'   => $daysRemaining,
            'expiry_warning'   => $daysRemaining !== null && $daysRemaining <= 7,
            'payment_status'   => $sub?->payment_reference ? 'paid' : ($sub?->status === 'active' && $clinic->plan?->type === 'free' ? 'free' : 'unpaid'),
            'owner'            => $clinic->users?->first()?->name ?? '—',
            'owner_email'      => $clinic->users?->first()?->email ?? '—',
            'created_at'       => $clinic->created_at->format('d M Y'),
            'approved_at'      => $clinic->approved_at?->format('d M Y'),
        ];
    }

    private function formatBranch(Branch $branch): array
    {
        return [
            'id'               => $branch->id,
            'name'             => $branch->name,
            'subdomain'        => $branch->subdomain,
            'subdomain_active' => (bool) $branch->subdomain_active,
            'status'           => $branch->status,
            'location'         => $branch->location,
            'phone'            => $branch->phone,
            'email'            => $branch->email,
        ];
    }
}

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
    /**
     * GET /api/v1/platform/clinics
     */
    public function index(Request $request): JsonResponse
    {
        $query = Clinic::with(['plan', 'users' => function ($q) {
            $q->where('role', 'clinic_admin')->select('id', 'clinic_id', 'name', 'email');
        }])->withCount('users');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name',  'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('email','like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $clinics = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $clinics->map(fn($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'email'       => $c->email,
                'phone'       => $c->phone,
                'city'        => $c->city,
                'country'     => $c->country,
                'address'     => $c->address,
                'status'      => $c->status,
                'plan'        => $c->plan?->name,
                'plan_id'     => $c->plan_id,
                'owner'       => $c->users->first()?->name ?? '—',
                'owner_email' => $c->users->first()?->email ?? '—',
                'created_at'  => $c->created_at->format('d M Y'),
                'approved_at' => $c->approved_at?->format('d M Y'),
            ]),
            'meta' => [
                'total'     => $clinics->count(),
                'active'    => $clinics->where('status', 'active')->count(),
                'pending'   => $clinics->where('status', 'pending_platform_approval')->count(),
                'suspended' => $clinics->where('status', 'suspended')->count(),
            ],
        ]);
    }

    /**
     * POST /api/v1/platform/clinics/{clinic}/approve
     *
     * 1. Activates the clinic
     * 2. Creates clinic_admin user if not already exists
     * 3. Creates the main branch using clinic data
     * 4. Activates subscription
     */
   public function approve(Clinic $clinic): JsonResponse
{
    if ($clinic->status === 'active') {
        return response()->json([
            'success' => false,
            'message' => 'Clinic is already active.',
        ], 422);
    }

    // ── 1. Activate clinic ────────────────────────────────────────────────
    $clinic->update([
        'status'      => 'active',
        'approved_at' => now(),
    ]);

    // ── 2. Create clinic_admin user if not already exists ─────────────────
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

        // ── Send approval email with login credentials ────────────────
        try {
            \Mail::to($clinic->email)
                ->send(new \App\Mail\ClinicApprovedMail($clinic, $clinicAdmin, $tempPassword));
        } catch (\Exception $e) {
            \Log::error('[DentFlow] Approval email failed', [
                'clinic_id' => $clinic->id,
                'error'     => $e->getMessage(),
            ]);
        }

    } else {
        // Just activate the existing admin
        $existingAdmin->update(['is_active' => true]);
    }

    // ── 3. Create main branch using clinic data (if not already exists) ───
    $mainBranchExists = Branch::where('clinic_id', $clinic->id)->exists();

    if (!$mainBranchExists) {
        Branch::create([
            'clinic_id' => $clinic->id,
            'name'      => $clinic->name . ' — Main Branch',
            'location'  => trim(($clinic->address ?? '') . ', ' . ($clinic->city ?? ''), ', '),
            'phone'     => $clinic->phone,
            'email'     => $clinic->email,
            'status'    => 'active',
        ]);
    }

    // ── 4. Activate subscription ──────────────────────────────────────────
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

    return response()->json([
        'success'       => true,
        'message'       => "Clinic '{$clinic->name}' approved. Main branch created.",
        'data'          => ['status' => 'active'],
        'temp_password' => $tempPassword,
    ]);
}

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

    /**
     * POST /api/v1/platform/clinics/{clinic}/suspend
     */
    public function suspend(Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'suspended']);
        $clinic->users()->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => "Clinic '{$clinic->name}' has been suspended.",
            'data'    => ['status' => 'suspended'],
        ]);
    }

    /**
     * POST /api/v1/platform/clinics/{clinic}/reactivate
     */
    public function reactivate(Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'active']);
        $clinic->users()->where('role', 'clinic_admin')->update(['is_active' => true]);

        return response()->json([
            'success' => true,
            'message' => "Clinic '{$clinic->name}' has been reactivated.",
            'data'    => ['status' => 'active'],
        ]);
    }
}
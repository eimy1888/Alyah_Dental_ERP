<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
//use Illuminate\Support\Facades\Cookie;
// use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Resolve user from either:
     * 1. Sanctum Bearer header (already works for token auth)
     * 2. HttpOnly cookie — must decrypt first since Laravel encrypts all cookies
     */
    // private function resolveUser(Request $request): ?User
    // {
    //     // Sanctum's normal resolution via Bearer header
    //     $user = $request->user('sanctum');
    //     if ($user) return $user;

    //     // Read the raw cookie value (may be encrypted by Laravel)
    //     $rawCookie = $request->cookie('dentflow_token');
    //     if (! $rawCookie) return null;

    //     // Decrypt it — Laravel encrypts cookies by default
    //     try {
    //         $token = Crypt::decryptString($rawCookie);
    //     } catch (\Exception) {
    //         // Cookie wasn't encrypted (e.g. set with httpOnly raw=true)
    //         // fall back to using the raw value directly
    //         $token = $rawCookie;
    //     }

    //     $pat = PersonalAccessToken::findToken($token);
    //     if (! $pat) return null;

    //     // Optional: check token expiry if you set expiration
    //     return $pat->tokenable;
    // }

    private function resolveUser(Request $request): ?User
{
    // The EncryptCookies middleware runs before controllers and decrypts
    // all cookies automatically — so $request->cookie() gives plain text.
    $token = $request->cookie('dentflow_token');

    if (! $token) return null;

    $pat = PersonalAccessToken::findToken($token);

    return $pat?->tokenable;
}

    /**
     * POST /api/v1/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)
                    ->with(['clinic:id,name,status,plan_id,slug,subdomain', 'branch:id,name,location,status'])
                    ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not active yet. Please wait for clinic approval.',
            ], 403);
        }

        if ($user->role !== 'platform_admin' && $user->clinic) {
            if (! in_array($user->clinic->status, ['active'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your clinic is pending approval or has been suspended.',
                ], 403);
            }
        }

        $user->tokens()->delete();

        $clinicSlug = null;
        if ($user->clinic) {
            $clinicSlug = $user->clinic->slug
                ?? $user->clinic->subdomain
                ?? \Illuminate\Support\Str::slug($user->clinic->name);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'user'   => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'phone'     => $user->phone,
                    'role'      => $user->role,
                    'is_active' => $user->is_active,
                    'clinic_id' => $user->clinic_id,
                    'branch_id' => $user->branch_id,
                ],
                'clinic' => $user->clinic ? [
                    'id'      => $user->clinic->id,
                    'name'    => $user->clinic->name,
                    'slug'    => $clinicSlug,
                    'status'  => $user->clinic->status,
                    'plan_id' => $user->clinic->plan_id,
                ] : null,
                'branch' => $user->branch ? [
                    'id'       => $user->branch->id,
                    'name'     => $user->branch->name,
                    'location' => $user->branch->location,
                    'status'   => $user->branch->status,
                ] : null,
            ],
        ])->cookie(
            'dentflow_token',
            $token,                              // plain token — Laravel encrypts it automatically
            60 * 24 * 7,
            '/',
            null,
            app()->environment('production'),    // secure only in production
            true,                                // httpOnly
            false,                               // raw — false means Laravel encrypts it
            'lax'
        );
    }

    /**
     * POST /api/v1/auth/logout
     */
       /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->cookie('dentflow_token');

        if ($token) {
            // EncryptCookies middleware already decrypted the cookie
            $pat = PersonalAccessToken::findToken($token);
            $pat?->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ])->withoutCookie('dentflow_token');
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->load([
            'clinic:id,name,status,plan_id,slug,subdomain',
            'branch:id,name,location,status',
        ]);

        $clinicSlug = null;
        if ($user->clinic) {
            $clinicSlug = $user->clinic->slug
                ?? $user->clinic->subdomain
                ?? \Illuminate\Support\Str::slug($user->clinic->name);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'user'   => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'phone'     => $user->phone,
                    'role'      => $user->role,
                    'is_active' => $user->is_active,
                    'clinic_id' => $user->clinic_id,
                    'branch_id' => $user->branch_id,
                ],
                'clinic' => $user->clinic ? [
                    'id'      => $user->clinic->id,
                    'name'    => $user->clinic->name,
                    'slug'    => $clinicSlug,
                    'status'  => $user->clinic->status,
                    'plan_id' => $user->clinic->plan_id,
                ] : null,
                'branch' => $user->branch ? [
                    'id'       => $user->branch->id,
                    'name'     => $user->branch->name,
                    'location' => $user->branch->location,
                    'status'   => $user->branch->status,
                ] : null,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/patient-register
     */
    public function patientRegister(Request $request): JsonResponse
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'phone'     => 'required|string|max:20',
            'password'  => 'required|string|min:8',
            'clinic_id' => 'nullable|exists:clinics,id',
        ]);

        $nameParts = explode(' ', trim($request->name), 2);
        $firstName = $nameParts[0];
        $lastName  = $nameParts[1] ?? '';

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'phone'     => $request->phone,
            'password'  => Hash::make($request->password),
            'role'      => 'patient',
            'clinic_id' => $request->clinic_id,
            'is_active' => true,
        ]);

        $patient = \App\Models\Patient::create([
            'clinic_id'  => $request->clinic_id,
            'user_id'    => $user->id,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'phone'      => $request->phone,
            'email'      => $request->email,
            'status'     => 'active',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully.',
            'data'    => [
                'user'    => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'phone'     => $user->phone,
                    'role'      => $user->role,
                    'is_active' => $user->is_active,
                    'clinic_id' => $user->clinic_id,
                    'branch_id' => $user->branch_id,
                ],
                'patient' => [
                    'id'         => $patient->id,
                    'first_name' => $patient->first_name,
                    'last_name'  => $patient->last_name,
                    'full_name'  => $patient->full_name,
                ],
            ],
        ], 201)->cookie(
            'dentflow_token',
            $token,
            60 * 24 * 7,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'lax'
        );
    }
}
<?php
namespace App\Http\Controllers\Api\V1\Dentist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class SettingsController extends Controller
{
    // ── Get dentist profile ────────────────────────────────
    public function getProfile(Request $request): JsonResponse
    {
        $dentist = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $dentist->id,
                'name'       => $dentist->name,
                'email'      => $dentist->email,
                'phone'      => $dentist->phone,
                'role'       => $dentist->role,
                'clinic'     => [
                    'id'   => $dentist->clinic?->id,
                    'name' => $dentist->clinic?->name,
                ],
                'branch'     => [
                    'id'       => $dentist->branch?->id,
                    'name'     => $dentist->branch?->name,
                    'location' => $dentist->branch?->location,
                ],
                'created_at' => $dentist->created_at->toDateString(),
            ],
        ]);
    }

    // ── Update dentist profile ─────────────────────────────
    public function updateProfile(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'max:255',
                // Unique but ignore current user
                \Illuminate\Validation\Rule::unique('users', 'email')
                    ->ignore($dentist->id),
            ],
            'phone' => 'nullable|string|max:20',
        ]);

        $dentist->update([
            'name'  => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data'    => [
                'id'    => $dentist->id,
                'name'  => $dentist->name,
                'email' => $dentist->email,
                'phone' => $dentist->phone,
            ],
        ]);
    }

    // ── Change password ────────────────────────────────────
    public function changePassword(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $request->validate([
            'old_password'     => 'required|string',
            'new_password'     => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers(),
            ],
            'new_password_confirmation' => 'required|string',
        ]);

        // Verify old password
        if (!Hash::check($request->old_password, $dentist->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
                'errors'  => [
                    'old_password' => ['The current password you entered is incorrect.'],
                ],
            ], 422);
        }

        // Prevent reusing same password
        if (Hash::check($request->new_password, $dentist->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password.',
                'errors'  => [
                    'new_password' => ['New password cannot be the same as your current password.'],
                ],
            ], 422);
        }

        $dentist->update([
            'password' => Hash::make($request->new_password),
        ]);

        // Revoke all existing tokens — force re-login on other devices
        $dentist->tokens()->delete();

        // Issue new token for current session
        $newToken = $dentist->createToken('dentist-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
            'data'    => [
                'token' => $newToken,
            ],
        ]);
    }

    // ── Get clinic info (read only) ────────────────────────
    public function getClinicInfo(Request $request): JsonResponse
    {
        $dentist = $request->user();

        $clinic = $dentist->clinic;
        $branch = $dentist->branch;

        return response()->json([
            'success' => true,
            'data'    => [
                'clinic' => [
                    'id'       => $clinic?->id,
                    'name'     => $clinic?->name,
                    'status'   => $clinic?->status,
                    'settings' => $clinic?->settings,
                ],
                'branch' => [
                    'id'           => $branch?->id,
                    'name'         => $branch?->name,
                    'location'     => $branch?->location,
                    'phone'        => $branch?->phone,
                    'email'        => $branch?->email,
                    'status'       => $branch?->status,
                    'manager_name' => $branch?->manager_name,
                ],
            ],
        ]);
    }

    /**
 * Get services for procedure selection
 * 
 * GET /api/v1/dentist/services
 */
public function getServices(Request $request): JsonResponse
{
    $dentist = $request->user();
    $clinicId = $dentist->clinic_id;

    $services = \App\Models\Service::where('clinic_id', $clinicId)
        ->where('is_published', true)
        ->orderBy('name')
        ->get(['id', 'name', 'description', 'duration_minutes', 'price']);

    return response()->json([
        'success' => true,
        'data' => $services->map(fn($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'description' => $s->description,
            'duration_minutes' => $s->duration_minutes,
            'price' => (float) $s->price,
            'formatted_price' => $s->formatted_price,
        ]),
    ]);
}
}
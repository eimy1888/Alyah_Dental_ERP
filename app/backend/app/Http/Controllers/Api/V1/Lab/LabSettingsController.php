<?php

namespace App\Http\Controllers\Api\V1\Lab;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;

class LabSettingsController extends Controller
{
    // ── Get lab technician profile ─────────────────────────────────────────
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'phone'      => $user->phone,
                'role'       => $user->role,
                'clinic'     => [
                    'id'   => $user->clinic?->id,
                    'name' => $user->clinic?->name,
                ],
                'branch'     => [
                    'id'   => $user->branch?->id,
                    'name' => $user->branch?->name,
                ],
                'created_at' => $user->created_at?->toDateString(),
            ],
        ]);
    }

    // ── Update profile ─────────────────────────────────────────────────────
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $user->update([
            'name'  => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
        ]);
    }

    // ── Change password ────────────────────────────────────────────────────
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'old_password'              => 'required|string',
            'new_password'              => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'new_password_confirmation' => 'required|string',
        ]);

        if (!Hash::check($request->old_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
                'errors'  => ['old_password' => ['The current password you entered is incorrect.']],
            ], 422);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password.',
                'errors'  => ['new_password' => ['New password cannot be the same as your current password.']],
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);
        $user->tokens()->delete();
        $newToken = $user->createToken('lab-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
            'data'    => ['token' => $newToken],
        ]);
    }
}

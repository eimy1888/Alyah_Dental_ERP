<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class SettingsController extends Controller
{
    /**
     * GET /api/v1/platform/settings/profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['platform_admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Platform admin access required.',
            ], 403);
        }

        return response()->json([
            'status' => true,
            'data'   => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'role'  => $user->role,
            ],
        ]);
    }

    /**
     * PUT /api/v1/platform/settings/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['platform_admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Platform admin access required.',
            ], 403);
        }

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:30',
        ]);

        $user->update($validated);

        return response()->json([
            'status'  => true,
            'message' => 'Profile updated successfully.',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
            ],
        ]);
    }

    /**
     * PUT /api/v1/platform/settings/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['platform_admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Platform admin access required.',
            ], 403);
        }

        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status'  => false,
                'message' => 'Current password is incorrect.',
                'errors'  => [
                    'current_password' => ['Current password is incorrect.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Password updated successfully.',
        ]);
    }
}
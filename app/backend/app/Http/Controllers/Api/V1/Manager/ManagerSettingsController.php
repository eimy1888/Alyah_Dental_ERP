<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ManagerSettingsController extends Controller
{
    /**
     * GET /api/v1/manager/settings/profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['branch:id,name,location', 'clinic:id,name']);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'phone'     => $user->phone ?? '',
                'role'      => $user->role,
                'branch'    => $user->branch ? [
                    'id'       => $user->branch->id,
                    'name'     => $user->branch->name,
                    'location' => $user->branch->location,
                ] : null,
                'clinic'    => $user->clinic ? [
                    'id'   => $user->clinic->id,
                    'name' => $user->clinic->name,
                ] : null,
            ],
        ]);
    }

    /**
     * PUT /api/v1/manager/settings/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:30',
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
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
     * PUT /api/v1/manager/settings/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
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
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    public function getServices(Request $request): JsonResponse
{
    $user = $request->user();

    $services = \App\Models\Service::where('clinic_id', $user->clinic_id)
        ->where('is_active', true)
        ->orderBy('name')
        ->get(['id', 'name', 'duration_minutes', 'price', 'category']);

    return response()->json([
        'success' => true,
        'data'    => $services,
    ]);
}
}
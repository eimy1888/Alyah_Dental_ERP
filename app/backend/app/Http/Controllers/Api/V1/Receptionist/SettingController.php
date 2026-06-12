<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Models\Branch;
use App\Models\User;
use App\Models\Appointment;

class SettingController extends Controller
{
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role'  => $user->role,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data'    => $user,
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => Hash::make($validated['new_password'])]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    public function getBranchInfo(Request $request): JsonResponse
    {
        $user   = $request->user();
        $branch = Branch::find($user->branch_id);

        return response()->json([
            'success' => true,
            'data' => [
                'id'           => $branch?->id,
                'name'         => $branch?->name ?? 'Main Branch',
                'location'     => $branch?->location ?? 'Addis Ababa',
                'phone'        => $branch?->phone,
                'email'        => $branch?->email,
                'manager_name' => $branch?->manager_name,
            ],
        ]);
    }

    public function getDentists(Request $request): JsonResponse
    {
        $user = $request->user();

        $dentists = User::where('clinic_id', $user->clinic_id)
            ->where('role', 'dentist')
            ->where('is_active', true)
            ->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'data'    => $dentists,
        ]);
    }

    public function getNotificationCount(Request $request): JsonResponse
    {
        $user = $request->user();

        // Count today's pending/confirmed appointments as actionable notifications
        $count = Appointment::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->whereDate('appointment_time', today())
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();

        return response()->json([
            'success' => true,
            'data'    => ['count' => $count],
        ]);
    }

    public function getServices(Request $request): JsonResponse
{
    $user = $request->user();

    $services = \App\Models\Service::where('clinic_id', $user->clinic_id)
        ->where('is_active', true)
        ->orderBy('display_order')
        ->orderBy('name')
        ->get(['id', 'name', 'duration_minutes', 'price', 'category',
               'required_specializations', 'booking_type']);

    return response()->json([
        'success' => true,
        'data'    => $services,
    ]);
}
}
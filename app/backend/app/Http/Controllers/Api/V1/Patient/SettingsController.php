<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use App\Models\Clinic;
use App\Models\Branch;
use App\Models\Service;
use App\Models\Patient;
use App\Models\User;

class SettingsController extends Controller
{
    // ── Get patient profile ──────────────────────────────────────────────
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get patient record linked to this user
        $patient = Patient::where('user_id', $user->id)->first();
        
        if (!$patient) {
            // Try to find by email
            $patient = Patient::where('email', $user->email)->first();
        }
        
        $lastMedicalCase = null;
        if ($patient && $patient->medical_cases && is_array($patient->medical_cases) && count($patient->medical_cases) > 0) {
            $lastCase = end($patient->medical_cases);
            $lastMedicalCase = $lastCase['case'] ?? null;
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $patient?->id ?? $user->id,
                'user_id' => $user->id,
                'full_name' => $user->name,
                'first_name' => $patient?->first_name ?? explode(' ', $user->name)[0] ?? '',
                'last_name' => $patient?->last_name ?? (explode(' ', $user->name)[1] ?? ''),
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $patient?->phone ?? $user->phone,
                'gender' => $patient?->gender ?? null,
                'date_of_birth' => $patient?->date_of_birth,
                'age' => $patient?->date_of_birth ? now()->diffInYears($patient->date_of_birth) : null,
                'last_medical_case' => $lastMedicalCase,
                'medical_cases' => $patient?->medical_cases ?? [],
                'address' => $patient?->address,
                'role' => $user->role,
                'created_at' => $user->created_at?->toDateString(),
            ],
        ]);
    }

    // ── Update patient profile ───────────────────────────────────────────
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'max:255',
                \Illuminate\Validation\Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date|before:today',
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|in:male,female,other',
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
        ]);
        
        // Update patient record if exists
        $patient = Patient::where('user_id', $user->id)->first();
        if ($patient) {
            $patient->update([
                'first_name' => explode(' ', $request->name)[0] ?? '',
                'last_name' => explode(' ', $request->name)[1] ?? '',
                'phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'address' => $request->address,
                'gender' => $request->gender,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'date_of_birth' => $request->date_of_birth,
                'address' => $request->address,
            ],
        ]);
    }

    // ── Change password ──────────────────────────────────────────────────
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers(),
            ],
            'new_password_confirmation' => 'required|string',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
                'errors' => [
                    'current_password' => ['The current password you entered is incorrect.'],
                ],
            ], 422);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password.',
                'errors' => [
                    'new_password' => ['New password cannot be the same as your current password.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    // ── Get clinic and branch info (read-only) ───────────────────────────
    public function getClinicInfo(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinic = Clinic::find($user->clinic_id);
        $branch = Branch::find($user->branch_id);

        return response()->json([
            'success' => true,
            'data' => [
                'clinic' => [
                    'id' => $clinic?->id,
                    'name' => $clinic?->name,
                    'address' => $clinic?->address,
                    'phone' => $clinic?->phone,
                    'email' => $clinic?->email,
                    'settings' => $clinic?->settings,
                ],
                'branch' => [
                    'id' => $branch?->id,
                    'name' => $branch?->name,
                    'location' => $branch?->location,
                ],
            ],
        ]);
    }

    /**
     * Get services for patient dropdown
     */
    public function getServices(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;

        $services = Service::where('clinic_id', $clinicId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'duration_minutes', 'price', 'category', 'description']);

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }
}
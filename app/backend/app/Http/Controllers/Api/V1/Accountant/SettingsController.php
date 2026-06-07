<?php

namespace App\Http\Controllers\Api\V1\Accountant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use App\Models\Branch;

class SettingsController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // Get accountant profile
    // ─────────────────────────────────────────────────────────────
    public function getProfile(Request $request): JsonResponse
    {
        $accountant = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $accountant->id,
                'name' => $accountant->name,
                'email' => $accountant->email,
                'phone' => $accountant->phone,
                'role' => $accountant->role,
                'clinic' => [
                    'id' => $accountant->clinic?->id,
                    'name' => $accountant->clinic?->name,
                ],
                'created_at' => $accountant->created_at->toDateString(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Update accountant profile
    // ─────────────────────────────────────────────────────────────
    public function updateProfile(Request $request): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'max:255',
                \Illuminate\Validation\Rule::unique('users', 'email')->ignore($accountant->id),
            ],
            'phone' => 'nullable|string|max:20',
        ]);

        $accountant->update([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'id' => $accountant->id,
                'name' => $accountant->name,
                'email' => $accountant->email,
                'phone' => $accountant->phone,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Change password
    // ─────────────────────────────────────────────────────────────
    public function changePassword(Request $request): JsonResponse
    {
        $accountant = $request->user();

        $request->validate([
            'old_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers(),
            ],
            'new_password_confirmation' => 'required|string',
        ]);

        // Verify old password
        if (!Hash::check($request->old_password, $accountant->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
                'errors' => [
                    'old_password' => ['The current password you entered is incorrect.'],
                ],
            ], 422);
        }

        // Prevent reusing same password
        if (Hash::check($request->new_password, $accountant->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password.',
                'errors' => [
                    'new_password' => ['New password cannot be the same as your current password.'],
                ],
            ], 422);
        }

        $accountant->update([
            'password' => Hash::make($request->new_password),
        ]);

        // Revoke all existing tokens
        $accountant->tokens()->delete();

        // Issue new token for current session
        $newToken = $accountant->createToken('accountant-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
            'data' => [
                'token' => $newToken,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Get clinic and branches info (read-only)
    // ─────────────────────────────────────────────────────────────
    public function getClinicInfo(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinic = $accountant->clinic;

        // Get all branches for this clinic (for branch filtering)
        $branches = Branch::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->get(['id', 'name', 'location']);

        return response()->json([
            'success' => true,
            'data' => [
                'clinic' => [
                    'id' => $clinic->id,
                    'name' => $clinic->name,
                    'address' => $clinic->address ?? '—',
                    'phone' => $clinic->phone ?? '—',
                    'email' => $clinic->email ?? '—',
                    'settings' => $clinic->settings,
                ],
                'branches' => $branches->map(fn($b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'location' => $b->location,
                ]),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Get dashboard filters (branches for dropdown)
    // ─────────────────────────────────────────────────────────────
    public function getFilters(Request $request): JsonResponse
    {
        $accountant = $request->user();
        $clinic = $accountant->clinic;

        $branches = Branch::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->get(['id', 'name']);

        // Add "All Branches" option
        $branchOptions = collect([['id' => 'all', 'name' => 'All Branches']])
            ->merge($branches->map(fn($b) => ['id' => (string)$b->id, 'name' => $b->name]));

        return response()->json([
            'success' => true,
            'data' => [
                'branches' => $branchOptions,
                'expense_categories' => [
                    ['value' => 'consumables', 'label' => 'Consumables'],
                    ['value' => 'payroll', 'label' => 'Payroll'],
                    ['value' => 'utilities', 'label' => 'Utilities'],
                    ['value' => 'rent', 'label' => 'Rent'],
                    ['value' => 'marketing', 'label' => 'Marketing'],
                    ['value' => 'maintenance', 'label' => 'Maintenance'],
                    ['value' => 'software', 'label' => 'Software'],
                    ['value' => 'other', 'label' => 'Other'],
                ],
                'invoice_statuses' => [
                    ['value' => 'all', 'label' => 'All'],
                    ['value' => 'draft', 'label' => 'Draft'],
                    ['value' => 'sent', 'label' => 'Sent'],
                    ['value' => 'partial', 'label' => 'Partial'],
                    ['value' => 'paid', 'label' => 'Paid'],
                    ['value' => 'overdue', 'label' => 'Overdue'],
                    ['value' => 'cancelled', 'label' => 'Cancelled'],
                ],
                'claim_statuses' => [
                    ['value' => 'all', 'label' => 'All'],
                    ['value' => 'draft', 'label' => 'Draft'],
                    ['value' => 'submitted', 'label' => 'Submitted'],
                    ['value' => 'approved', 'label' => 'Approved'],
                    ['value' => 'rejected', 'label' => 'Rejected'],
                    ['value' => 'paid', 'label' => 'Paid'],
                ],
                'tax_statuses' => [
                    ['value' => 'all', 'label' => 'All'],
                    ['value' => 'pending', 'label' => 'Pending'],
                    ['value' => 'paid', 'label' => 'Paid'],
                ],
            ],
        ]);
    }
}
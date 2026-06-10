<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ManagerStaffController extends Controller
{
    private function manager(Request $request): User
    {
        return $request->user();
    }

    /**
     * GET /api/v1/manager/staff
     * Returns staff for this branch only.
     */
    public function index(Request $request): JsonResponse
    {
        $manager  = $this->manager($request);
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        // Validate branch assignment
        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'No branch assigned to this manager account. Please contact administrator.',
                'data'    => []
            ], 400);
        }

        $staff = Staff::forClinic($clinicId)
            ->forBranch($branchId)
            ->with(['user', 'branch:id,name'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->search;
                $q->whereHas('user', fn($u) =>
                    $u->where('name', 'like', "%{$term}%")
                      ->orWhere('email', 'like', "%{$term}%")
                );
            })
            ->when(
                $request->filled('role') && $request->role !== 'All',
                fn($q) => $q->whereHas('user', fn($u) => $u->where('role', $request->role))
            )
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $staff->map->toApiArray(),
        ]);
    }

    /**
     * POST /api/v1/manager/staff
     * Creates both user + staff records with optional photo upload.
     */
 /**
 * POST /api/v1/manager/staff
 * Creates both user + staff records with optional photo upload.
 */
public function store(Request $request): JsonResponse
{
    $manager  = $this->manager($request);
    $clinicId = $manager->clinic_id;
    $branchId = $manager->branch_id;

    $validated = $request->validate([
        'name'           => 'required|string|max:255',
        'email'          => 'nullable|email|unique:users,email',
        'phone'          => 'required|string|max:20',
        'role'           => ['required', Rule::in(['dentist', 'receptionist', 'accountant', 'branch_manager', 'clinic_admin'])],
        'gender'         => 'nullable|in:male,female,not_to_say',
        'specialization' => 'nullable|string|max:255',
        'working_days'   => 'nullable|string|max:100',
        'time_window'    => 'nullable|string|max:100',
        'bio'            => 'nullable|string',
        'show_on_showcase' => 'nullable|boolean',
        'branch_id'      => 'nullable|integer|exists:branches,id',
    ]);

    // FIX: Convert empty string branch_id to null so the fallback works
    $submittedBranchId = $validated['branch_id'] ?? null;
    if ($submittedBranchId === '' || $submittedBranchId === null) {
        $submittedBranchId = null;
    }

    // Auto-generate temp password
    $tempPassword = \Illuminate\Support\Str::random(10);

    // 1. Create user account
    // Use submitted branch_id if valid, otherwise fallback to manager's branch_id
    $targetBranchId = $submittedBranchId ?? $branchId;
    
    $user = User::create([
        'name'      => $validated['name'],
        'email'     => $validated['email'] ?? null,
        'phone'     => $validated['phone'],
        'role'      => $validated['role'],
        'password'  => \Illuminate\Support\Facades\Hash::make($tempPassword),
        'clinic_id' => $clinicId,
        'branch_id' => $targetBranchId,
        'is_active' => true,
    ]);

    // 2. Create staff record
    $staff = Staff::create([
        'user_id'          => $user->id,
        'clinic_id'        => $clinicId,
        'branch_id'        => $targetBranchId,
        'specialization'   => $validated['specialization'] ?? null,
        'working_days'     => $validated['working_days'] ?? null,
        'time_window'      => $validated['time_window'] ?? null,
        'bio'              => $validated['bio'] ?? null,
        'gender'           => $validated['gender'] ?? null,
        'show_on_showcase' => $validated['show_on_showcase'] ?? false,
        'photo'            => null,
    ]);

    return response()->json([
        'success'       => true,
        'message'       => 'Staff member added successfully.',
        'data'          => $staff->fresh(['user', 'branch'])->toApiArray(),
        'temp_password' => $tempPassword,
    ], 201);
}
    /**
     * PUT /api/v1/manager/staff/{id}
     * Supports multipart/form-data with _method=PUT spoofing
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $manager  = $this->manager($request);
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'No branch assigned to this manager.',
            ], 400);
        }

        // Find staff record scoped to this branch
        $staff = Staff::forClinic($clinicId)
            ->forBranch($branchId)
            ->findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'email'          => [
                'sometimes', 'email',
                Rule::unique('users', 'email')->ignore($staff->user_id),
            ],
            'phone'          => 'nullable|string|max:20',
            'role'           => ['sometimes', Rule::in(['dentist', 'receptionist', 'accountant'])],
            'password'       => 'nullable|string|min:8',
            'is_active'      => 'sometimes|boolean',
            'gender'         => 'nullable|string|in:male,female,other',
            'specialization' => 'nullable|string|max:255',
            'working_days'   => 'nullable|string|max:100',
            'time_window'    => 'nullable|string|max:100',
            'bio'            => 'nullable|string|max:500',
            'photo'          => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'remove_photo'   => 'nullable|boolean',
        ]);

        // Handle photo upload/removal
        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($staff->photo) {
                Storage::disk('public')->delete($staff->photo);
            }
            $photoPath = $request->file('photo')->store('staff-photos', 'public');
            $staff->photo = $photoPath;
        }
        
        if ($request->boolean('remove_photo')) {
            if ($staff->photo) {
                Storage::disk('public')->delete($staff->photo);
                $staff->photo = null;
            }
        }

        // Sync identity fields to user
        if ($staff->user_id) {
            $userFields = [];
            
            if ($request->has('name')) $userFields['name'] = $validated['name'];
            if ($request->has('email')) $userFields['email'] = $validated['email'];
            if ($request->has('phone')) $userFields['phone'] = $validated['phone'];
            if ($request->has('role')) $userFields['role'] = $validated['role'];
            if ($request->has('is_active')) $userFields['is_active'] = $validated['is_active'];
            
            if ($request->filled('password')) {
                $userFields['password'] = Hash::make($validated['password']);
            }

            if (!empty($userFields)) {
                User::where('id', $staff->user_id)->update($userFields);
            }
        }

        // Update professional fields
        $staffFields = [];
        if ($request->has('gender')) $staffFields['gender'] = $validated['gender'];
        if ($request->has('specialization')) $staffFields['specialization'] = $validated['specialization'];
        if ($request->has('working_days')) $staffFields['working_days'] = $validated['working_days'];
        if ($request->has('time_window')) $staffFields['time_window'] = $validated['time_window'];
        if ($request->has('bio')) $staffFields['bio'] = $validated['bio'];
        
        if (!empty($staffFields)) {
            $staff->update($staffFields);
        } else if ($request->hasFile('photo') || $request->boolean('remove_photo')) {
            // Save photo changes even if no other fields
            $staff->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Staff member updated successfully.',
            'data'    => $staff->fresh(['user', 'branch'])->toApiArray(),
        ]);
    }

    /**
     * DELETE /api/v1/manager/staff/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $manager  = $this->manager($request);
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'No branch assigned to this manager.',
            ], 400);
        }

        $staff = Staff::forClinic($clinicId)
            ->forBranch($branchId)
            ->findOrFail($id);

        // Delete staff photo if exists
        if ($staff->photo) {
            Storage::disk('public')->delete($staff->photo);
        }

        // Delete user → staff record deletes via cascade
        if ($staff->user_id) {
            User::where('id', $staff->user_id)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Staff member removed successfully.',
        ]);
    }


    /**
 * GET /api/v1/manager/dentists
 * Returns only dentists for this branch — used by appointment + waitlist modals.
 */
public function getDentists(Request $request): JsonResponse
{
    $manager  = $this->manager($request);
    $clinicId = $manager->clinic_id;
    $branchId = $manager->branch_id;

    $dentists = Staff::forClinic($clinicId)
        ->forBranch($branchId)
        ->dentists()
        ->available()
        ->with('user:id,name,role')
        ->get()
        ->map(fn($s) => [
            'id'                 => $s->id,
            'user_id'            => $s->user_id,
            'name'               => $s->name,
            'specialization'     => $s->specialization ?? 'General Dentistry',
            'is_available'       => true,
            'is_active'          => $s->is_active,
        ]);

    return response()->json([
        'success' => true,
        'data'    => $dentists,
    ]);
}
}
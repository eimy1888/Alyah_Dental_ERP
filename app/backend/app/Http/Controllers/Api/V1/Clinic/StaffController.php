<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StaffController extends Controller
{
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    private function mapRole(string $displayRole): string
    {
        return match($displayRole) {
            'Branch Manager' => 'branch_manager',
            'Dentist'        => 'dentist',
            'Receptionist'   => 'receptionist',
            'Accountant'     => 'accountant',
            'Clinic Admin'   => 'clinic_admin',
            default          => strtolower(str_replace(' ', '_', $displayRole)),
        };
    }

    private function handlePhotoUpload(Request $request, ?string $oldPhoto = null): ?string
    {
        if (!$request->hasFile('photo')) return $oldPhoto;

        // Delete old photo if exists
        if ($oldPhoto) {
            Storage::disk('public')->delete($oldPhoto);
        }

        $path = $request->file('photo')->store('staff-photos', 'public');
        return $path;
    }

    /**
     * GET /api/v1/admin/staff
     */
    public function index(Request $request): JsonResponse
    {
        $search   = $request->get('search', '');
        $role     = $request->get('role', '');
        $branchId = $request->get('branch_id', '');
        $clinicId = $this->clinicId();

        $staff = Staff::forClinic($clinicId)
            ->with(['user', 'branch:id,name'])
            ->when($search, function ($q) use ($search) {
                $q->whereHas('user', fn($u) =>
                    $u->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                );
            })
            ->when($role, function ($q) use ($role) {
                $q->whereHas('user', fn($u) => $u->where('role', $role));
            })
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->orderBy('id', 'desc')
            ->get();

        $staffArray = $staff->map->toApiArray();

        return response()->json([
            'success' => true,
            'data'    => $staffArray,
            'meta'    => [
                'total'   => $staff->count(),
                'active'  => $staff->filter(fn($s) => $s->is_active)->count(),
                'by_role' => $staffArray->groupBy('role')->map->count(),
            ],
        ]);
    }

    /**
     * POST /api/v1/admin/staff
     * Accepts multipart/form-data for photo upload.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'role'             => 'required|string|max:100',
            'phone'            => 'required|string|max:20',
            'email'            => 'nullable|email|max:255|unique:users,email',
            'gender'           => 'nullable|in:male,female,other',
            'branch_id'        => 'nullable|integer|exists:branches,id',
            'specialization'   => 'nullable|string|max:255',
            'working_days'     => 'nullable|string|max:100',
            'time_window'      => 'nullable|string|max:100',
            'photo'            => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'bio'              => 'nullable|string',
            'show_on_showcase' => 'nullable|boolean',
        ]);

        if (!empty($validated['branch_id'])) {
            $branchOk = \App\Models\Branch::where('id', $validated['branch_id'])
                ->where('clinic_id', $this->clinicId())
                ->exists();

            if (!$branchOk) {
                return response()->json([
                    'success' => false,
                    'message' => 'Branch not found in your clinic.',
                ], 422);
            }
        }

        $photoPath    = $this->handlePhotoUpload($request);
        $tempPassword = Str::random(10);
        $userRole     = $this->mapRole($validated['role']);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'] ?? null,
            'phone'     => $validated['phone'],
            'password'  => Hash::make($tempPassword),
            'role'      => $userRole,
            'clinic_id' => $this->clinicId(),
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => true,
        ]);

        $staff = Staff::create([
            'user_id'          => $user->id,
            'clinic_id'        => $this->clinicId(),
            'branch_id'        => $validated['branch_id'] ?? null,
            'specialization'   => $validated['specialization'] ?? null,
            'working_days'     => $validated['working_days'] ?? null,
            'time_window'      => $validated['time_window'] ?? null,
            'photo'            => $photoPath,
            'bio'              => $validated['bio'] ?? null,
            'show_on_showcase' => $validated['show_on_showcase'] ?? false,
            'gender'           => $validated['gender'] ?? null,
        ]);

        \App\Models\AuditLog::record('staff.created', [
            'subject_type'  => 'Staff',
            'subject_id'    => $staff->id,
            'subject_label' => $validated['name'],
            'new_values'    => ['role' => $userRole, 'branch_id' => $validated['branch_id'] ?? null],
        ], request());

        return response()->json([
            'success'       => true,
            'message'       => 'Staff member added successfully.',
            'data'          => $staff->fresh(['user', 'branch'])->toApiArray(),
            'temp_password' => $tempPassword,
        ], 201);
    }

    /**
     * PUT /api/v1/admin/staff/{staff}
     * Accepts multipart/form-data for photo upload.
     */
    public function update(Request $request, Staff $staff): JsonResponse
    {
        if ($staff->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'role'             => 'sometimes|string|max:100',
            'phone'            => 'sometimes|string|max:20',
            'email'            => 'nullable|email|max:255',
            'gender'           => 'nullable|in:male,female,other',
            'branch_id'        => 'nullable|integer|exists:branches,id',
            'specialization'   => 'nullable|string|max:255',
            'working_days'     => 'nullable|string|max:100',
            'time_window'      => 'nullable|string|max:100',
            'is_active'        => 'sometimes|boolean',
            'photo'            => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'bio'              => 'nullable|string',
            'show_on_showcase' => 'nullable|boolean',
        ]);

        $photoPath = $this->handlePhotoUpload($request, $staff->photo);

        if ($staff->user_id) {
            $userFields = [];
            if (isset($validated['name']))      $userFields['name']      = $validated['name'];
            if (isset($validated['email']))     $userFields['email']     = $validated['email'];
            if (isset($validated['phone']))     $userFields['phone']     = $validated['phone'];
            if (isset($validated['role']))      $userFields['role']      = $this->mapRole($validated['role']);
            if (isset($validated['branch_id'])) $userFields['branch_id'] = $validated['branch_id'];
            if (isset($validated['is_active'])) $userFields['is_active'] = $validated['is_active'];
            if ($userFields) User::where('id', $staff->user_id)->update($userFields);
        }

        $staff->update([
            'branch_id'        => $validated['branch_id']        ?? $staff->branch_id,
            'specialization'   => $validated['specialization']    ?? $staff->specialization,
            'working_days'     => $validated['working_days']      ?? $staff->working_days,
            'time_window'      => $validated['time_window']       ?? $staff->time_window,
            'photo'            => $photoPath,
            'bio'              => $validated['bio']               ?? $staff->bio,
            'show_on_showcase' => $validated['show_on_showcase']  ?? $staff->show_on_showcase,
            'gender'           => $validated['gender']            ?? $staff->gender,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff member updated.',
            'data'    => $staff->fresh(['user', 'branch'])->toApiArray(),
        ]);
    }

    /**
     * DELETE /api/v1/admin/staff/{staff}
     */
    public function destroy(Staff $staff): JsonResponse
    {
        if ($staff->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($staff->photo) {
            Storage::disk('public')->delete($staff->photo);
        }

        if ($staff->user_id) {
            User::where('id', $staff->user_id)->delete();
        }

        $staff->delete();

        \App\Models\AuditLog::record('staff.deleted', [
            'subject_type'  => 'Staff',
            'subject_id'    => $staff->id,
            'subject_label' => $staff->user?->name ?? "Staff #{$staff->id}",
            'old_values'    => ['role' => $staff->user?->role, 'branch' => $staff->branch?->name],
        ], request());

        return response()->json([
            'success' => true,
            'message' => 'Staff member removed.',
        ]);
    }
}
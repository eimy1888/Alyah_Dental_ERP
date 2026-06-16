<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * Resolve the clinic_id from the authenticated user.
     * Clinic admin can only see/touch their own clinic's branches.
     */
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    /**
     * GET /api/v1/clinic/branches
     */
    public function index(Request $request): JsonResponse
    {
        $search   = $request->get('search', '');
        $clinicId = $this->clinicId();

        $branches = Branch::forClinic($clinicId)
            ->when($search, fn($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('manager_name', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $branches,
            'meta'    => [
                'total'  => $branches->count(),
                'active' => $branches->where('status', 'active')->count(),
            ],
        ]);
    }

    /**
     * POST /api/v1/clinic/branches
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'location'      => 'nullable|string|max:500',
            'phone'         => 'nullable|string|max:20',
            'email'         => 'nullable|email|max:255',
            'manager_name'  => 'nullable|string|max:255',
            'status'        => 'nullable|in:active,soft_launch,inactive',
            'working_hours' => 'nullable|array',
            'working_hours.monday'    => 'nullable|string',
            'working_hours.tuesday'   => 'nullable|string',
            'working_hours.wednesday' => 'nullable|string',
            'working_hours.thursday'  => 'nullable|string',
            'working_hours.friday'    => 'nullable|string',
            'working_hours.saturday'  => 'nullable|string',
            'working_hours.sunday'    => 'nullable|string',
            'map_link'      => 'nullable|string|max:500',
        ]);

        $branch = Branch::create([
            ...$validated,
            'clinic_id' => $this->clinicId(),
            'status'    => $validated['status'] ?? 'active',
        ]);

        \App\Models\AuditLog::record('branch.created', [
            'subject_type'  => 'Branch',
            'subject_id'    => $branch->id,
            'subject_label' => $branch->name,
            'new_values'    => ['status' => $branch->status, 'location' => $branch->location],
        ], request());

        return response()->json([
            'success' => true,
            'message' => 'Branch created successfully.',
            'data'    => $branch,
        ], 201);
    }

    /**
     * PUT /api/v1/clinic/branches/{branch}
     */
    public function update(Request $request, Branch $branch): JsonResponse
    {
        // Ensure branch belongs to this clinic
        if ($branch->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'location'      => 'nullable|string|max:500',
            'phone'         => 'nullable|string|max:20',
            'email'         => 'nullable|email|max:255',
            'manager_name'  => 'nullable|string|max:255',
            'status'        => 'nullable|in:active,soft_launch,inactive',
            'working_hours' => 'nullable|array',
            'working_hours.monday'    => 'nullable|string',
            'working_hours.tuesday'   => 'nullable|string',
            'working_hours.wednesday' => 'nullable|string',
            'working_hours.thursday'  => 'nullable|string',
            'working_hours.friday'    => 'nullable|string',
            'working_hours.saturday'  => 'nullable|string',
            'working_hours.sunday'    => 'nullable|string',
            'map_link'      => 'nullable|string|max:500',
        ]);

        $branch->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Branch updated successfully.',
            'data'    => $branch->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/clinic/branches/{branch}
     */
    public function destroy(Branch $branch): JsonResponse
    {
        if ($branch->clinic_id !== $this->clinicId()) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $branch->delete();

        \App\Models\AuditLog::record('branch.deleted', [
            'subject_type'  => 'Branch',
            'subject_id'    => $branch->id,
            'subject_label' => $branch->name,
            'old_values'    => ['status' => $branch->status],
        ], request());

        return response()->json([
            'success' => true,
            'message' => 'Branch deleted successfully.',
        ]);
    }
}
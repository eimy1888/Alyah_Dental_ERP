<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Specialization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpecializationController extends Controller
{
    private function clinicId(): int
    {
        return request()->user()->clinic_id;
    }

    /**
     * GET /api/v1/admin/specializations
     * Returns system defaults + clinic's own specializations.
     */
    public function index(): JsonResponse
    {
        $specs = Specialization::forClinic($this->clinicId())
            ->ordered()
            ->get()
            ->map(fn($s) => $this->format($s));

        return response()->json(['success' => true, 'data' => $specs]);
    }

    /**
     * POST /api/v1/admin/specializations
     * Create a clinic-specific specialization.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'short_code'  => 'nullable|string|max:10',
            'description' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer|min:0',
        ]);

        $spec = Specialization::create([
            'clinic_id'   => $this->clinicId(),
            'name'        => $validated['name'],
            'short_code'  => $validated['short_code'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active'   => true,
            'sort_order'  => $validated['sort_order']
                ?? Specialization::where('clinic_id', $this->clinicId())->count() + 100,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Specialization created.',
            'data'    => $this->format($spec),
        ], 201);
    }

    /**
     * PUT /api/v1/admin/specializations/{id}
     * Update a clinic-owned specialization (cannot edit system defaults).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $spec = Specialization::where('clinic_id', $this->clinicId())->findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'short_code'  => 'nullable|string|max:10',
            'description' => 'nullable|string|max:500',
            'is_active'   => 'sometimes|boolean',
            'sort_order'  => 'nullable|integer|min:0',
        ]);

        $spec->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Specialization updated.',
            'data'    => $this->format($spec->fresh()),
        ]);
    }

    /**
     * DELETE /api/v1/admin/specializations/{id}
     * Delete a clinic-owned specialization (cannot delete system defaults).
     */
    public function destroy(int $id): JsonResponse
    {
        $spec = Specialization::where('clinic_id', $this->clinicId())->findOrFail($id);
        $spec->delete();

        return response()->json(['success' => true, 'message' => 'Specialization deleted.']);
    }

    private function format(Specialization $s): array
    {
        return [
            'id'          => $s->id,
            'name'        => $s->name,
            'short_code'  => $s->short_code,
            'description' => $s->description,
            'is_active'   => $s->is_active,
            'sort_order'  => $s->sort_order,
            'is_system'   => $s->clinic_id === null,  // system defaults cannot be deleted
        ];
    }
}

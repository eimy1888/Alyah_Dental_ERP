<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * GET /api/v1/platform/users
     * List all users across all clinics — view only for platform admin.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['clinic:id,name,city'])
            ->where('role', '!=', 'platform_admin');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name',  'like', "%{$search}%")
                  ->orWhere('email','like', "%{$search}%");
            });
        }

        // Role filter
        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $isActive = $request->status === 'active';
            $query->where('is_active', $isActive);
        }

        $users = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $users->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'role'       => $u->role,
                'is_active'  => $u->is_active,
                'status'     => $u->is_active ? 'active' : 'inactive',
                'clinic'     => $u->clinic?->name ?? '—',
                'clinic_id'  => $u->clinic_id,
                'city'       => $u->clinic?->city ?? '—',
                'joined'     => $u->created_at->format('d M Y'),
            ]),
            'meta' => [
                'total'     => $users->count(),
                'active'    => $users->where('is_active', true)->count(),
                'inactive'  => $users->where('is_active', false)->count(),
                'by_role'   => $users->groupBy('role')->map->count(),
            ],
        ]);
    }
}
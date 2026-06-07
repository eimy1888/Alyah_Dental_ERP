<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingsController extends Controller
{
    private function clinic(): Clinic
    {
        return Clinic::findOrFail(request()->user()->clinic_id);
    }

    private function user(): User
    {
        return request()->user();
    }

    // ── GET all settings in one call ─────────────────────────────────────────

    /**
     * GET /api/v1/clinic/settings
     * Returns clinic profile + admin profile + notification prefs + tax/invoice settings
     */
    public function index(): JsonResponse
    {
        $clinic = $this->clinic();
        $user   = $this->user();

        $settings = $clinic->settings ?? [];

        return response()->json([
            'success' => true,
            'data'    => [
                'clinic' => [
                    'id'             => $clinic->id,
                    'name'           => $clinic->name,
                    'email'          => $clinic->email,
                    'phone'          => $clinic->phone,
                    'address'        => $clinic->address,
                    'city'           => $clinic->city,
                    'country'        => $clinic->country,
                    'subdomain'      => $clinic->subdomain,
                    'invoice_prefix' => $settings['invoice_prefix']  ?? 'INV',
                    'theme'          => $settings['theme']            ?? 'default',
                    'tax_rate'       => $settings['tax_rate']         ?? '15',
                    'payment_terms'  => $settings['payment_terms']    ?? 'Due upon receipt',
                    'invoice_footer' => $settings['invoice_footer']   ?? '',
                    'notifications'  => $settings['notifications']    ?? [
                        'queue_alerts'          => true,
                        'low_stock'             => true,
                        'claim_updates'         => true,
                        'failed_payments'       => false,
                        'appointment_reminders' => true,
                        'staff_attendance'      => false,
                    ],
                ],
                'admin' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role'  => $user->role,
                ],
            ],
        ]);
    }

    // ── Clinic profile ────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/clinic/settings/clinic
     */
    public function updateClinic(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'email'          => 'sometimes|email|max:255',
            'phone'          => 'sometimes|string|max:20',
            'address'        => 'nullable|string|max:500',
            'city'           => 'nullable|string|max:100',
            'country'        => 'nullable|string|max:100',
            'invoice_prefix' => 'nullable|string|max:20',
            'theme'          => 'nullable|string|max:50',
        ]);

        $clinic   = $this->clinic();
        $settings = $clinic->settings ?? [];

        // Split into clinic columns vs settings JSON
        $clinicFields   = array_intersect_key($validated, array_flip(['name', 'email', 'phone', 'address', 'city', 'country']));
        $settingsFields = array_intersect_key($validated, array_flip(['invoice_prefix', 'theme']));

        if ($clinicFields) {
            $clinic->update($clinicFields);
        }

        if ($settingsFields) {
            $clinic->update(['settings' => array_merge($settings, $settingsFields)]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Clinic profile updated.',
            'data'    => $clinic->fresh(),
        ]);
    }

    // ── Admin (own) profile ───────────────────────────────────────────────────

    /**
     * PUT /api/v1/clinic/settings/admin
     */
    public function updateAdmin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $this->user()->id,
            'phone' => 'nullable|string|max:20',
        ]);

        $this->user()->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated.',
            'data'    => $this->user()->fresh(),
        ]);
    }

    // ── Password ──────────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/clinic/settings/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password'      => 'required|string',
            'new_password'          => 'required|string|min:8|confirmed',
        ]);

        $user = $this->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/clinic/settings/notifications
     */
    public function updateNotifications(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'queue_alerts'          => 'boolean',
            'low_stock'             => 'boolean',
            'claim_updates'         => 'boolean',
            'failed_payments'       => 'boolean',
            'appointment_reminders' => 'boolean',
            'staff_attendance'      => 'boolean',
        ]);

        $clinic   = $this->clinic();
        $settings = $clinic->settings ?? [];

        $clinic->update([
            'settings' => array_merge($settings, [
                'notifications' => array_merge(
                    $settings['notifications'] ?? [],
                    $validated
                ),
            ]),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification preferences saved.',
            'data'    => $clinic->fresh()->settings['notifications'],
        ]);
    }

    // ── Tax & Invoice ─────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/clinic/settings/tax-invoice
     */
    public function updateTaxInvoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tax_rate'       => 'nullable|numeric|min:0|max:100',
            'payment_terms'  => 'nullable|string|max:100',
            'invoice_footer' => 'nullable|string|max:500',
            'invoice_prefix' => 'nullable|string|max:20',
        ]);

        $clinic   = $this->clinic();
        $settings = $clinic->settings ?? [];

        $clinic->update([
            'settings' => array_merge($settings, $validated),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tax & invoice settings saved.',
        ]);
    }

    // ── Showcase Settings ─────────────────────────────────────────────────────

    /**
     * GET /api/v1/clinic/settings/showcase
     * Get current showcase settings
     */
    public function getShowcaseSettings(): JsonResponse
    {
        $clinic   = $this->clinic();
        $settings = $clinic->settings ?? [];
        $showcase = $settings['showcase'] ?? [];

        return response()->json([
            'success' => true,
            'data' => [
                'hero_title'      => $showcase['hero_title']      ?? '',
                'hero_subtitle'   => $showcase['hero_subtitle']   ?? '',
                'hero_image_url'  => $showcase['hero_image_url']  ?? '',
                'contact_email'   => $showcase['contact_email']   ?? $clinic->email,
                'contact_phone'   => $showcase['contact_phone']   ?? $clinic->phone,
                'contact_address' => $showcase['contact_address'] ?? $clinic->address,
                'specialty'       => $showcase['specialty']       ?? '',
                'social_links'    => $showcase['social_links']    ?? [
                    'facebook'  => '',
                    'instagram' => '',
                    'twitter'   => '',
                    'linkedin'  => '',
                ],
                'stats' => $showcase['stats'] ?? [
                    'monthly_patients'  => '',
                    'satisfaction_rate' => '',
                    'years_experience'  => '',
                    'happy_patients'    => '',
                ],
            ],
        ]);
    }

    /**
     * PUT /api/v1/clinic/settings/showcase
     * Update showcase settings (hero, contact, social, stats)
     */
    public function updateShowcaseSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hero_title'                  => 'nullable|string|max:255',
            'hero_subtitle'               => 'nullable|string|max:500',
            'hero_image_url'              => 'nullable|string|max:500',
            'contact_email'               => 'nullable|email|max:255',
            'contact_phone'               => 'nullable|string|max:20',
            'contact_address'             => 'nullable|string|max:500',
            'specialty'                   => 'nullable|string|max:100',
            'social_links'                => 'nullable|array',
            'social_links.facebook'       => 'nullable|string|max:255',
            'social_links.instagram'      => 'nullable|string|max:255',
            'social_links.twitter'        => 'nullable|string|max:255',
            'social_links.linkedin'       => 'nullable|string|max:255',
            'stats'                       => 'nullable|array',
            'stats.monthly_patients'      => 'nullable|integer',
            'stats.satisfaction_rate'     => 'nullable|integer|min:0|max:100',
            'stats.years_experience'      => 'nullable|integer',
            'stats.happy_patients'        => 'nullable|integer',
        ]);

        $clinic = $this->clinic();
        $settings = $clinic->settings ?? [];

        // Merge showcase settings
        $settings['showcase'] = array_merge(
            $settings['showcase'] ?? [],
            $validated
        );

        $clinic->settings = $settings;
        $clinic->save();

        return response()->json([
            'success' => true,
            'message' => 'Showcase settings updated successfully.',
            'data' => $settings['showcase'],
        ]);
    }

    // ── Services Management ───────────────────────────────────────────────────

    /**
     * GET /api/v1/clinic/services
     * Get all services for the clinic
     */
    public function getServices(): JsonResponse
    {
        $clinic = $this->clinic();
        $services = \App\Models\Service::where('clinic_id', $clinic->id)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    /**
     * POST /api/v1/clinic/services
     * Create a new service
     */
    public function createService(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'duration_minutes' => 'nullable|integer|min:0',
            'price' => 'required|numeric|min:0',
            'icon_url' => 'nullable|string|max:500',
            'is_published' => 'boolean',
        ]);
        
        $clinic = $this->clinic();
        
        $service = \App\Models\Service::create([
            'clinic_id' => $clinic->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'category' => $validated['category'] ?? 'general',
            'duration_minutes' => $validated['duration_minutes'] ?? 30,
            'price' => $validated['price'],
            'icon_url' => $validated['icon_url'] ?? null,
            'is_published' => $validated['is_published'] ?? true,
            'display_order' => \App\Models\Service::where('clinic_id', $clinic->id)->count(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Service created successfully.',
            'data' => $service,
        ], 201);
    }

    /**
     * PUT /api/v1/clinic/services/{id}
     * Update a service
     */
    public function updateService(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'duration_minutes' => 'nullable|integer|min:0',
            'price' => 'sometimes|numeric|min:0',
            'icon_url' => 'nullable|string|max:500',
            'is_published' => 'boolean',
        ]);
        
        $clinic = $this->clinic();
        
        $service = \App\Models\Service::where('clinic_id', $clinic->id)->findOrFail($id);
        $service->update($validated);
        
        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully.',
            'data' => $service,
        ]);
    }

    /**
     * DELETE /api/v1/clinic/services/{id}
     * Delete a service
     */
    public function deleteService(int $id): JsonResponse
    {
        $clinic = $this->clinic();
        
        $service = \App\Models\Service::where('clinic_id', $clinic->id)->findOrFail($id);
        $service->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully.',
        ]);
    }
}
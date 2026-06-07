<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Clinic;
use App\Models\Service;
use App\Models\Staff;
use App\Models\Branch;

class PublicShowcaseController extends Controller
{
    /**
     * GET /api/v1/public/approved-clinics
     * Returns all active/approved clinics with their showcase settings for the landing page.
     */
    public function approvedClinics(): JsonResponse
    {
        $clinics = Clinic::where('status', 'active')
            ->whereNotNull('approved_at')
            ->orderBy('approved_at', 'desc')
            ->get()
            ->map(function ($clinic) {
                $showcase = ($clinic->settings ?? [])['showcase'] ?? [];
                return [
                    'id'              => $clinic->id,
                    'name'            => $clinic->name,
                    'slug'            => $clinic->slug,
                    'subdomain'       => $clinic->subdomain,
                    'city'            => $clinic->city,
                    'address'         => $clinic->address,
                    'phone'           => $clinic->phone,
                    'email'           => $clinic->email,
                    'hero_title'      => $showcase['hero_title']    ?? null,
                    'hero_subtitle'   => $showcase['hero_subtitle']  ?? null,
                    'hero_image_url'  => $showcase['hero_image_url'] ?? null,
                    'specialty'       => $showcase['specialty']      ?? null,
                    'social_links'    => $showcase['social_links']   ?? [],
                    'stats'           => $showcase['stats']          ?? [],
                ];
            });

        return response()->json(['success' => true, 'data' => $clinics]);
    }

    private function getClinicBySlug(string $slug): ?Clinic
    {
        return Clinic::where('slug', $slug)
            ->orWhere('subdomain', $slug)
            ->where('status', 'active')
            ->first();
    }

    public function clinicProfile(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->getClinicBySlug($slug);
        
        if (!$clinic) {
            return response()->json([
                'success' => false,
                'message' => 'Clinic not found.',
            ], 404);
        }
        
        $settings = $clinic->settings ?? [];
        $showcase = $settings['showcase'] ?? [];
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $clinic->id,
                'slug' => $clinic->slug,
                'name' => $clinic->name,
                'email' => $clinic->email,
                'phone' => $clinic->phone,
                'address' => $clinic->address,
                'city' => $clinic->city,
                'hero_title' => $showcase['hero_title'] ?? 'Your healthy smile starts here',
                'hero_subtitle' => $showcase['hero_subtitle'] ?? 'Experience world-class dental care',
                'hero_image_url' => $showcase['hero_image_url'] ?? null,
                'contact_email' => $showcase['contact_email'] ?? $clinic->email,
                'contact_phone' => $showcase['contact_phone'] ?? $clinic->phone,
                'contact_address' => $showcase['contact_address'] ?? $clinic->address,
                'social_links' => $showcase['social_links'] ?? [],
                'stats' => $showcase['stats'] ?? [],
            ],
        ]);
    }

    public function services(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->getClinicBySlug($slug);
        
        if (!$clinic) {
            return response()->json([
                'success' => false,
                'message' => 'Clinic not found.',
            ], 404);
        }
        
        $services = Service::where('clinic_id', $clinic->id)
            ->where('is_published', true)
            ->orderBy('name')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    public function staff(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->getClinicBySlug($slug);

        if (!$clinic) {
            return response()->json(['success' => false, 'message' => 'Clinic not found.'], 404);
        }

        $staff = Staff::where('clinic_id', $clinic->id)
            ->whereHas('user', fn($q) => $q->where('is_active', true))
            ->with('user')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $staff->map(fn($s) => $s->toApiArray()),
        ]);
    }

    public function branches(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->getClinicBySlug($slug);
        
        if (!$clinic) {
            return response()->json([
                'success' => false,
                'message' => 'Clinic not found.',
            ], 404);
        }
        
        $branches = Branch::where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $branches,
        ]);
    }

    public function testimonials(Request $request, string $slug): JsonResponse
    {
        // Mock testimonials for Phase 1
        $testimonials = [
            [
                'id' => 1,
                'patient_name' => 'Tigist Bekele',
                'rating' => 5,
                'comment' => 'The best dental experience I\'ve ever had! The staff is incredibly friendly and professional.',
                'treatment' => 'Teeth Whitening',
                'date' => 'March 15, 2024',
            ],
            [
                'id' => 2,
                'patient_name' => 'Dawit Haile',
                'rating' => 5,
                'comment' => 'I was always afraid of dentists until I came here. The team is patient and understanding.',
                'treatment' => 'Root Canal',
                'date' => 'March 10, 2024',
            ],
            [
                'id' => 3,
                'patient_name' => 'Meron Tadesse',
                'rating' => 5,
                'comment' => 'Dr. Yonas did an amazing job with my Invisalign treatment. My teeth are now perfectly aligned!',
                'treatment' => 'Invisalign',
                'date' => 'March 5, 2024',
            ],
        ];
        
        return response()->json([
            'success' => true,
            'data' => [
                'testimonials' => $testimonials,
                'average_rating' => 5,
                'total_reviews' => 3,
            ],
        ]);
    }

    public function contact(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);
        
        $clinic = $this->getClinicBySlug($slug);
        
        \Log::info('Contact form submission', [
            'clinic' => $clinic?->name ?? 'Unknown',
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent. We will get back to you soon.',
        ]);
    }
}
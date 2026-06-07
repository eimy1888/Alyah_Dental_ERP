<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Clinic;

return new class extends Migration
{
    public function up(): void
    {
        // This migration updates the settings JSON structure for existing clinics
        // No schema changes needed, just data update
        $clinics = Clinic::all();
        
        foreach ($clinics as $clinic) {
            $settings = $clinic->settings ?? [];
            
            // Only add showcase settings if not already present
            if (!isset($settings['showcase'])) {
                $settings['showcase'] = [
                    'hero_title' => 'Your healthy smile starts here',
                    'hero_subtitle' => 'Experience world-class dental care with Ethiopia\'s most trusted professionals',
                    'hero_image_url' => null,
                    'contact_email' => $clinic->email ?? 'info@clinic.com',
                    'contact_phone' => $clinic->phone ?? '+251 911 000 000',
                    'contact_address' => $clinic->address ?? 'Bole Road, Addis Ababa',
                    'social_links' => [
                        'facebook' => null,
                        'instagram' => null,
                        'twitter' => null,
                        'linkedin' => null,
                    ],
                    'stats' => [
                        'monthly_patients' => 800,
                        'satisfaction_rate' => 98,
                        'years_experience' => 15,
                        'happy_patients' => 15000,
                    ],
                ];
                
                $clinic->settings = $settings;
                $clinic->saveQuietly();
            }
        }
    }

    public function down(): void
    {
        $clinics = Clinic::all();
        
        foreach ($clinics as $clinic) {
            $settings = $clinic->settings ?? [];
            unset($settings['showcase']);
            $clinic->settings = $settings;
            $clinic->saveQuietly();
        }
    }
};
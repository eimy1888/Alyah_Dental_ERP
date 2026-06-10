<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Clinic;
use App\Models\Service;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $clinics = Clinic::whereIn('status', ['active', 'pending'])->get();

        // billing_model ENUM: 'service' | 'treatment'
        $services = [
            // General
            ['name' => 'Consultation',            'category' => 'General',        'duration_minutes' => 30,  'price' => 200,   'billing_model' => 'service',   'description' => 'Initial patient consultation and examination.'],
            ['name' => 'Follow-up Visit',          'category' => 'General',        'duration_minutes' => 20,  'price' => 150,   'billing_model' => 'service',   'description' => 'Follow-up check after treatment.'],
            ['name' => 'Dental Cleaning',          'category' => 'Preventive',     'duration_minutes' => 45,  'price' => 500,   'billing_model' => 'service',   'description' => 'Professional teeth cleaning and polishing.'],
            ['name' => 'Fluoride Treatment',       'category' => 'Preventive',     'duration_minutes' => 20,  'price' => 300,   'billing_model' => 'service',   'description' => 'Fluoride application to strengthen enamel.'],
            ['name' => 'Dental X-Ray',             'category' => 'Diagnostics',    'duration_minutes' => 15,  'price' => 400,   'billing_model' => 'service',   'description' => 'Digital X-ray imaging (per film).'],
            ['name' => 'Panoramic X-Ray',          'category' => 'Diagnostics',    'duration_minutes' => 20,  'price' => 800,   'billing_model' => 'service',   'description' => 'Full-mouth panoramic radiograph.'],
            // Restorative
            ['name' => 'Tooth Filling (Composite)','category' => 'Restorative',   'duration_minutes' => 45,  'price' => 800,   'billing_model' => 'treatment', 'description' => 'White composite resin filling.'],
            ['name' => 'Tooth Filling (Amalgam)',  'category' => 'Restorative',   'duration_minutes' => 40,  'price' => 600,   'billing_model' => 'treatment', 'description' => 'Amalgam (silver) filling.'],
            ['name' => 'Root Canal Treatment',     'category' => 'Restorative',   'duration_minutes' => 90,  'price' => 3500,  'billing_model' => 'treatment', 'description' => 'Endodontic root canal therapy.'],
            ['name' => 'Dental Crown',             'category' => 'Restorative',   'duration_minutes' => 60,  'price' => 4500,  'billing_model' => 'treatment', 'description' => 'Porcelain or metal dental crown.'],
            ['name' => 'Dental Bridge',            'category' => 'Restorative',   'duration_minutes' => 60,  'price' => 8000,  'billing_model' => 'treatment', 'description' => 'Fixed dental bridge (3-unit).'],
            // Extraction
            ['name' => 'Simple Extraction',        'category' => 'Surgical',      'duration_minutes' => 30,  'price' => 500,   'billing_model' => 'treatment', 'description' => 'Simple tooth extraction under local anesthesia.'],
            ['name' => 'Surgical Extraction',      'category' => 'Surgical',      'duration_minutes' => 60,  'price' => 1500,  'billing_model' => 'treatment', 'description' => 'Complex surgical extraction (impacted tooth).'],
            // Cosmetic
            ['name' => 'Teeth Whitening',          'category' => 'Cosmetic',      'duration_minutes' => 60,  'price' => 2500,  'billing_model' => 'service',   'description' => 'Professional in-office teeth whitening.'],
            ['name' => 'Dental Veneer',            'category' => 'Cosmetic',      'duration_minutes' => 60,  'price' => 5000,  'billing_model' => 'treatment', 'description' => 'Porcelain veneer for cosmetic correction.'],
            // Orthodontics
            ['name' => 'Orthodontic Consultation', 'category' => 'Orthodontics',  'duration_minutes' => 45,  'price' => 300,   'billing_model' => 'service',   'description' => 'Braces and alignment assessment.'],
            ['name' => 'Braces (Full)',             'category' => 'Orthodontics',  'duration_minutes' => 90,  'price' => 25000, 'billing_model' => 'treatment', 'description' => 'Full fixed metal braces treatment.'],
            ['name' => 'Invisalign / Aligners',    'category' => 'Orthodontics',  'duration_minutes' => 60,  'price' => 35000, 'billing_model' => 'treatment', 'description' => 'Clear aligner orthodontic treatment.'],
            // Pediatric
            ['name' => 'Pediatric Check-up',       'category' => 'Pediatric',     'duration_minutes' => 30,  'price' => 250,   'billing_model' => 'service',   'description' => "Children's dental examination."],
            ['name' => 'Sealant (per tooth)',       'category' => 'Pediatric',     'duration_minutes' => 20,  'price' => 300,   'billing_model' => 'treatment', 'description' => 'Protective pit and fissure sealant.'],
            // Implants / Prosthodontics
            ['name' => 'Dental Implant',           'category' => 'Implants',      'duration_minutes' => 120, 'price' => 45000, 'billing_model' => 'treatment', 'description' => 'Titanium dental implant placement.'],
            ['name' => 'Denture (Full)',            'category' => 'Prosthodontics','duration_minutes' => 60,  'price' => 12000, 'billing_model' => 'treatment', 'description' => 'Complete removable denture.'],
            ['name' => 'Denture (Partial)',         'category' => 'Prosthodontics','duration_minutes' => 45,  'price' => 7000,  'billing_model' => 'treatment', 'description' => 'Removable partial denture.'],
            // Emergency
            ['name' => 'Emergency Visit',          'category' => 'Emergency',     'duration_minutes' => 30,  'price' => 400,   'billing_model' => 'service',   'description' => 'Urgent/emergency dental care.'],
        ];

        foreach ($clinics as $clinic) {
            foreach ($services as $index => $svc) {
                Service::firstOrCreate(
                    ['clinic_id' => $clinic->id, 'name' => $svc['name']],
                    [
                        'description'              => $svc['description'],
                        'category'                 => $svc['category'],
                        'duration_minutes'         => $svc['duration_minutes'],
                        'price'                    => $svc['price'],
                        'billing_model'            => $svc['billing_model'],
                        'generate_invoice_at_booking' => false,
                        'allow_prepayment'         => false,
                        'is_active'                => true,
                        'is_published'             => true,
                        'display_order'            => $index + 1,
                    ]
                );
            }
            $this->command->info("✅ Seeded " . count($services) . " services for clinic: {$clinic->name}");
        }
    }
}

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

        /*
         * billing_model:  'service'   = fixed price, invoice at booking
         *                 'treatment' = dynamic, dentist-driven episode
         * booking_type:   mirrors billing_model for the UI picker
         * required_specializations: JSON array of specialization names
         *   empty [] = any/general dentist
         * specialist_category: which specialist type is needed (null = GP handles)
         * is_diagnostic: true for diagnostic services
         * requires_fab_lab: true for prosthetics/lab work
         */
        $services = [
            // ── General ──────────────────────────────────────────────────────
            ['name'=>'Consultation',             'category'=>'General',        'specialist_category'=>null,                   'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>30,  'price'=>200,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Initial patient consultation and examination.'],
            ['name'=>'Follow-up Visit',           'category'=>'General',        'specialist_category'=>null,                   'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>20,  'price'=>150,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Follow-up check after treatment.'],

            // ── Preventive ───────────────────────────────────────────────────
            ['name'=>'Dental Cleaning',           'category'=>'Preventive',     'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>45,  'price'=>500,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Professional teeth cleaning and polishing.'],
            ['name'=>'Fluoride Treatment',        'category'=>'Preventive',     'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>20,  'price'=>300,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Fluoride application to strengthen enamel.'],
            ['name'=>'Dental X-Ray',              'category'=>'Diagnostics',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>true,  'requires_fab_lab'=>false, 'duration_minutes'=>15,  'price'=>400,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Digital X-ray imaging (per film).'],
            ['name'=>'Panoramic X-Ray',           'category'=>'Diagnostics',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>true,  'requires_fab_lab'=>false, 'duration_minutes'=>20,  'price'=>800,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Full-mouth panoramic radiograph.'],

            // ── Restorative ──────────────────────────────────────────────────
            ['name'=>'Tooth Filling (Composite)', 'category'=>'Restorative',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>45,  'price'=>800,   'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['General Dentistry'],               'description'=>'White composite resin filling.'],
            ['name'=>'Tooth Filling (Amalgam)',   'category'=>'Restorative',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>40,  'price'=>600,   'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['General Dentistry'],               'description'=>'Amalgam (silver) filling.'],
            ['name'=>'Root Canal Treatment',      'category'=>'Restorative',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>90,  'price'=>3500,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Endodontist','General Dentistry'],  'description'=>'Endodontic root canal therapy.'],
            ['name'=>'Dental Crown',              'category'=>'Restorative',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>60,  'price'=>4500,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Prosthodontist','General Dentistry'],'description'=>'Porcelain or metal dental crown.'],
            ['name'=>'Dental Bridge',             'category'=>'Restorative',    'specialist_category'=>'General Dentistry',    'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>60,  'price'=>8000,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Prosthodontist','General Dentistry'],'description'=>'Fixed dental bridge (3-unit).'],

            // ── Surgical ─────────────────────────────────────────────────────
            ['name'=>'Simple Extraction',         'category'=>'Surgical',       'specialist_category'=>'Oral Surgeon',         'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>30,  'price'=>500,   'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Oral Surgeon','General Dentistry'], 'description'=>'Simple tooth extraction under local anesthesia.'],
            ['name'=>'Surgical Extraction',       'category'=>'Surgical',       'specialist_category'=>'Oral Surgeon',         'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>60,  'price'=>1500,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Oral Surgeon'],                     'description'=>'Complex surgical extraction (impacted tooth).'],

            // ── Cosmetic ─────────────────────────────────────────────────────
            ['name'=>'Teeth Whitening',           'category'=>'Cosmetic',       'specialist_category'=>'Cosmetic Dentist',     'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>60,  'price'=>2500,  'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>['Cosmetic Dentist','General Dentistry'],'description'=>'Professional in-office teeth whitening.'],
            ['name'=>'Dental Veneer',             'category'=>'Cosmetic',       'specialist_category'=>'Cosmetic Dentist',     'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>60,  'price'=>5000,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Cosmetic Dentist','Prosthodontist'],  'description'=>'Porcelain veneer for cosmetic correction.'],

            // ── Orthodontics ─────────────────────────────────────────────────
            ['name'=>'Orthodontic Consultation',  'category'=>'Orthodontics',   'specialist_category'=>'Orthodontist',         'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>45,  'price'=>300,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>['Orthodontist'],                     'description'=>'Braces and alignment assessment.'],
            ['name'=>'Braces (Full)',              'category'=>'Orthodontics',   'specialist_category'=>'Orthodontist',         'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>90,  'price'=>25000, 'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Orthodontist'],                     'description'=>'Full fixed metal braces treatment.'],
            ['name'=>'Invisalign / Aligners',     'category'=>'Orthodontics',   'specialist_category'=>'Orthodontist',         'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>60,  'price'=>35000, 'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Orthodontist'],                     'description'=>'Clear aligner orthodontic treatment.'],

            // ── Pediatric ────────────────────────────────────────────────────
            ['name'=>'Pediatric Check-up',        'category'=>'Pediatric',      'specialist_category'=>'Pediatric Dentist',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>30,  'price'=>250,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>['Pediatric Dentist','General Dentistry'],'description'=>"Children's dental examination."],
            ['name'=>'Sealant (per tooth)',        'category'=>'Pediatric',      'specialist_category'=>'Pediatric Dentist',    'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>20,  'price'=>300,   'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Pediatric Dentist','General Dentistry'],'description'=>'Protective pit and fissure sealant.'],

            // ── Implants / Prosthodontics ────────────────────────────────────
            ['name'=>'Dental Implant',            'category'=>'Implants',       'specialist_category'=>'Oral Surgeon',         'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>120, 'price'=>45000, 'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Oral Surgeon','Prosthodontist'],    'description'=>'Titanium dental implant placement.'],
            ['name'=>'Denture (Full)',             'category'=>'Prosthodontics', 'specialist_category'=>'Prosthodontist',       'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>60,  'price'=>12000, 'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Prosthodontist'],                   'description'=>'Complete removable denture.'],
            ['name'=>'Denture (Partial)',          'category'=>'Prosthodontics', 'specialist_category'=>'Prosthodontist',       'is_diagnostic'=>false, 'requires_fab_lab'=>true,  'duration_minutes'=>45,  'price'=>7000,  'billing_model'=>'treatment', 'booking_type'=>'treatment', 'required_specializations'=>['Prosthodontist'],                   'description'=>'Removable partial denture.'],

            // ── Emergency ────────────────────────────────────────────────────
            ['name'=>'Emergency Visit',           'category'=>'Emergency',      'specialist_category'=>null,                   'is_diagnostic'=>false, 'requires_fab_lab'=>false, 'duration_minutes'=>30,  'price'=>400,   'billing_model'=>'service',   'booking_type'=>'service',   'required_specializations'=>[],                                  'description'=>'Urgent/emergency dental care.'],
        ];

        foreach ($clinics as $clinic) {
            foreach ($services as $index => $svc) {
                Service::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'name' => $svc['name']],
                    [
                        'description'                 => $svc['description'],
                        'category'                    => strtolower($svc['category']),
                        'specialist_category'         => $svc['specialist_category'],
                        'is_diagnostic'               => $svc['is_diagnostic'],
                        'requires_fab_lab'            => $svc['requires_fab_lab'],
                        'duration_minutes'            => $svc['duration_minutes'],
                        'price'                       => $svc['price'],
                        'billing_model'               => $svc['billing_model'],
                        'booking_type'                => $svc['booking_type'],
                        'required_specializations'    => json_encode($svc['required_specializations']),
                        'generate_invoice_at_booking' => false,
                        'allow_prepayment'            => false,
                        'is_active'                   => true,
                        'is_published'                => true,
                        'display_order'               => $index + 1,
                    ]
                );
            }
            $this->command->info("✅ Seeded/updated " . count($services) . " services for clinic: {$clinic->name}");
        }
    }
}

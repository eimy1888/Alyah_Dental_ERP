<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Patient;
use App\Models\Clinic;
use App\Models\Branch;
use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\ClinicalNote;
use App\Models\XRay;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Carbon\Carbon;

class PatientSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Starting PatientSeeder...');

        $clinic = Clinic::where('name', 'Nile Smile Specialty Dental')->first();
        if (!$clinic) {
            $this->command->error('Clinic not found. Run DemoClinicSeeder first.');
            return;
        }

        $branch = Branch::where('clinic_id', $clinic->id)->first();
        if (!$branch) {
            $this->command->error('Branch not found. Run BranchSeeder first.');
            return;
        }

        $dentist = User::where('role', 'dentist')
            ->where('clinic_id', $clinic->id)
            ->first();
        if (!$dentist) {
            $this->command->error('Dentist not found. Run DentistSeeder first.');
            return;
        }

        // ── Patient record in patients table ──────────────────────────────────
        $patientRecord = Patient::firstOrCreate(
            [
                'clinic_id' => $clinic->id,
                'phone'     => '+251911223344',
            ],
            [
                'branch_id'     => $branch->id,
                'first_name'    => 'Mikiyas',
                'last_name'     => 'Haile',
                'email'         => 'mikiyas@email.com',
                'date_of_birth' => '1990-05-15',
                'status'        => 'active',
                'created_by'    => $dentist->id,
            ]
        );
        $this->command->info('Patient record: ID ' . $patientRecord->id);

        // ── Patient portal User account ───────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'mikiyas@email.com'],
            [
                'name'      => 'Mikiyas Haile',
                'password'  => Hash::make('password'),
                'role'      => 'patient',
                'clinic_id' => $clinic->id,
                'branch_id' => $branch->id,
                'phone'     => '+251911223344',
                'is_active' => true,
            ]
        );
        $this->command->info('Patient user: mikiyas@email.com / password');

        $patientId = $patientRecord->id;

        // ── Appointments (EAT times - direct) ────────────────────────────────────
        foreach ([
            [
                'appointment_time' => Carbon::today()->setTime(9, 30),   // 09:30 EAT
                'type'   => 'Consultation',
                'status' => 'confirmed',
                'notes'  => 'Patient complains of sensitivity in upper left molar.',
            ],
            [
                'appointment_time' => Carbon::today()->setTime(10, 30),  // 10:30 EAT
                'type'   => 'Whitening',
                'status' => 'checked_in',
                'notes'  => 'Teeth whitening session.',
            ],
            [
                'appointment_time' => Carbon::today()->setTime(14, 30),  // 14:30 EAT
                'type'   => 'Root Canal',
                'status' => 'in_progress',
                'notes'  => 'Root canal treatment for tooth 26.',
            ],
            [
                'appointment_time' => Carbon::now()->subDays(5)->setTime(11, 0),  // 11:00 EAT
                'type'   => 'X-Ray',
                'status' => 'completed',
                'notes'  => 'Panoramic X-ray taken.',
            ],
            [
                'appointment_time' => Carbon::now()->subDays(10)->setTime(9, 30), // 09:30 EAT
                'type'   => 'Consultation',
                'status' => 'completed',
                'notes'  => 'Initial consultation.',
            ],
        ] as $data) {
            Appointment::create([
                'clinic_id'        => $clinic->id,
                'branch_id'        => $branch->id,
                'patient_id'       => $patientId,
                'dentist_id'       => $dentist->id,
                'appointment_time' => $data['appointment_time'],
                'type'             => $data['type'],
                'status'           => $data['status'],
                'notes'            => $data['notes'],
                'duration_minutes' => 30,
                'created_by'       => $dentist->id,
            ]);
        }
        $this->command->info('Appointments: 5 created');

        // ── Prescriptions ─────────────────────────────────────────────────────
        foreach ([
            [
                'medication'    => 'Amoxicillin',
                'dosage'        => '500mg 3x daily',
                'duration_days' => 7,
                'instructions'  => 'Take after meals. Avoid alcohol.',
                'issued_at'     => Carbon::now()->subDays(5),
            ],
            [
                'medication'    => 'Ibuprofen',
                'dosage'        => '400mg as needed',
                'duration_days' => 5,
                'instructions'  => 'Take for pain relief. Maximum 3 per day.',
                'issued_at'     => Carbon::now()->subDays(10),
            ],
        ] as $data) {
            Prescription::create(array_merge($data, [
                'clinic_id'     => $clinic->id,
                'branch_id'     => $branch->id,
                'patient_id'    => $patientId,
                'dentist_id'    => $dentist->id,
                'is_refillable' => false,
            ]));
        }
        $this->command->info('Prescriptions: 2 created');

        // ── Clinical Notes ────────────────────────────────────────────────────
        foreach ([
            [
                'note_type' => 'General',
                'content'   => 'Patient presents with sensitivity in upper left molar (tooth 26). Pain on cold stimuli. Recommended root canal evaluation.',
                'is_signed' => true,
                'signed_at' => Carbon::now()->subDays(5),
            ],
            [
                'note_type' => 'Treatment Plan',
                'content'   => 'Root canal recommended for tooth 26. Follow up in 2 weeks.',
                'is_signed' => false,
                'signed_at' => null,
            ],
        ] as $data) {
            ClinicalNote::create(array_merge($data, [
                'clinic_id'  => $clinic->id,
                'branch_id'  => $branch->id,
                'patient_id' => $patientId,
                'dentist_id' => $dentist->id,
            ]));
        }
        $this->command->info('Clinical Notes: 2 created (1 unsigned for dashboard demo)');

        // ── X-Rays ────────────────────────────────────────────────────────────
        XRay::create([
            'clinic_id'   => $clinic->id,
            'branch_id'   => $branch->id,
            'patient_id'  => $patientId,
            'dentist_id'  => $dentist->id,
            'study_type'  => 'Panoramic',
            'file_path'   => 'xrays/panoramic_mikiyas_2026.jpg',
            'file_name'   => 'panoramic_mikiyas_2026.jpg',
            'status'      => 'annotated',
            'findings'    => 'Mild bone loss around lower left molar. No periapical lesion detected.',
            'captured_at' => Carbon::now()->subDays(5),
        ]);
        $this->command->info('X-Rays: 1 created');

        // ── Invoice ───────────────────────────────────────────────────────────
        $invoice = Invoice::firstOrCreate(
            ['invoice_number' => 'INV-2026-0142'],
            [
                'clinic_id'  => $clinic->id,
                'branch_id'  => $branch->id,
                'patient_id' => $patientId,
                'issued_at'  => Carbon::now()->subDays(3),
                'due_date'   => Carbon::now()->addDays(12),
                'total'      => 12800,
                'paid'       => 9000,
                'balance'    => 3800,
                'status'     => 'partial',
                'created_by' => $dentist->id,
            ]
        );

        if ($invoice->wasRecentlyCreated) {
            foreach ([
                ['description' => 'Consultation',         'quantity' => 1, 'unit_price' => 800,   'total' => 800],
                ['description' => 'X-Ray - Panoramic',    'quantity' => 1, 'unit_price' => 1200,  'total' => 1200],
                ['description' => 'Root Canal Treatment', 'quantity' => 1, 'unit_price' => 10800, 'total' => 10800],
            ] as $item) {
                InvoiceItem::create(array_merge($item, ['invoice_id' => $invoice->id]));
            }

            Payment::firstOrCreate(
                ['reference' => 'PAY-TEL-2026-001'],
                [
                    'clinic_id'    => $clinic->id,
                    'branch_id'    => $branch->id,
                    'invoice_id'   => $invoice->id,
                    'patient_id'   => $patientId,
                    'amount'       => 9000,
                    'method'       => 'telebirr',
                    'status'       => 'completed',
                    'collected_by' => $dentist->id,
                    'paid_at'      => Carbon::now()->subDays(3),
                ]
            );
        }
        $this->command->info('Invoice + Payment: created');

        $this->command->info('');
        $this->command->info('✅ PatientSeeder completed!');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('👤 Patient login : mikiyas@email.com / password');
        $this->command->info('🦷 Dentist login : michael.chen@nilesmile.com / password');
        $this->command->info('📅 Appointments  : 5 (today: confirmed, checked_in, in_progress)');
        $this->command->info('💊 Prescriptions : 2');
        $this->command->info('📝 Clinical Notes: 2 (1 unsigned — shows on dentist dashboard)');
        $this->command->info('🩻 X-Rays        : 1');
        $this->command->info('💰 Invoice       : ETB 12,800 | Paid: 9,000 | Balance: 3,800');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}
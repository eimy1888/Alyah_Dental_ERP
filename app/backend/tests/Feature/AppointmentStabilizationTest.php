<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\PatientCheckedInNotification;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AppointmentStabilizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_dentist_overlap_detection_blocks_all_real_overlap_shapes(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->appointmentFixture();

        $existing = Appointment::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_time' => now()->addDay()->setTime(10, 0),
            'duration_minutes' => 60,
            'type' => 'Consultation',
            'status' => Appointment::STATUS_CONFIRMED,
            'created_by' => $dentist->id,
        ]);

        $this->assertTrue(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy()->subMinutes(30), 60));
        $this->assertTrue(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy()->addMinutes(30), 60));
        $this->assertTrue(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy(), 60));
        $this->assertFalse(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy()->subHour(), 60));
        $this->assertFalse(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy()->addHour(), 60));
        $this->assertFalse(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy(), 60, $existing->id));

        $otherDentist = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $this->assertFalse(Appointment::hasDentistOverlap($clinic->id, $branch->id, $otherDentist->id, $existing->appointment_time->copy(), 60));

        $existing->update(['status' => Appointment::STATUS_CANCELLED]);
        $this->assertFalse(Appointment::hasDentistOverlap($clinic->id, $branch->id, $dentist->id, $existing->appointment_time->copy(), 60));
    }

    public function test_patient_checked_in_notification_marks_state_and_prevents_duplicates(): void
    {
        Notification::fake();

        [$clinic, $branch, $patient, $dentist] = $this->appointmentFixture();

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_time' => now()->addHour(),
            'duration_minutes' => 30,
            'type' => 'Consultation',
            'status' => Appointment::STATUS_CHECKED_IN,
            'created_by' => $dentist->id,
            'is_notified' => false,
        ]);

        NotificationService::patientCheckedIn($appointment, 1);
        NotificationService::patientCheckedIn($appointment->fresh(), 1);

        $this->assertTrue($appointment->fresh()->is_notified);
        Notification::assertSentToTimes($dentist, PatientCheckedInNotification::class, 1);
    }

    private function appointmentFixture(): array
    {
        $suffix = uniqid();

        $clinic = Clinic::create([
            'name' => "Appointment Clinic {$suffix}",
            'subdomain' => "appointment-{$suffix}",
            'email' => "appointment-{$suffix}@example.test",
            'phone' => '123456789',
            'status' => 'active',
            'subdomain_active' => true,
        ]);

        $branch = Branch::create([
            'clinic_id' => $clinic->id,
            'name' => 'Main',
            'status' => 'active',
            'subdomain_active' => true,
        ]);

        $dentist = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'first_name' => 'Appointment',
            'last_name' => 'Patient',
            'phone' => '555-0110',
            'status' => 'active',
        ]);

        return [$clinic, $branch, $patient, $dentist];
    }
}

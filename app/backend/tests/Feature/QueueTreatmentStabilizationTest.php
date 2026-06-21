<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\QueueController;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\QueueItem;
use App\Models\TreatmentEpisode;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Tests\TestCase;

class QueueTreatmentStabilizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_enqueue_appointment_is_idempotent_and_sets_active_queue_key(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->fixture();
        $appointment = $this->appointment($clinic, $branch, $patient, $dentist);

        $first = QueueItem::enqueueAppointment($appointment, QueueItem::PRIORITY_SCHEDULED);
        $second = QueueItem::enqueueAppointment($appointment, QueueItem::PRIORITY_SCHEDULED);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, QueueItem::activeForAppointment($appointment->id)->count());
        $this->assertSame((string) $appointment->id, $first->fresh()->active_queue_key);
    }

    public function test_queue_positions_are_recalculated_without_gaps(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->fixture();
        $first = QueueItem::enqueueAppointment($this->appointment($clinic, $branch, $patient, $dentist), QueueItem::PRIORITY_SCHEDULED);
        $second = QueueItem::enqueueAppointment($this->appointment($clinic, $branch, $patient, $dentist), QueueItem::PRIORITY_WALK_IN);
        $third = QueueItem::enqueueAppointment($this->appointment($clinic, $branch, $patient, $dentist), QueueItem::PRIORITY_EMERGENCY);

        QueueItem::recalculatePositions($clinic->id, $branch->id, $dentist->id);

        $this->assertSame([1, 2, 3], QueueItem::forDentist($dentist->id)->waiting()->ordered()->pluck('position')->all());
        $this->assertSame($third->id, QueueItem::forDentist($dentist->id)->waiting()->ordered()->first()->id);

        $third->update(['status' => QueueItem::STATUS_REMOVED, 'completed_at' => now()]);
        QueueItem::recalculatePositions($clinic->id, $branch->id, $dentist->id);

        $this->assertSame([1, 2], QueueItem::forDentist($dentist->id)->waiting()->ordered()->pluck('position')->all());
        $this->assertSame(QueueItem::STATUS_WAITING, $first->fresh()->status);
        $this->assertSame(QueueItem::STATUS_WAITING, $second->fresh()->status);
    }

    public function test_call_next_blocks_completion_when_current_appointment_has_open_episode(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->fixture();
        $appointment = $this->appointment($clinic, $branch, $patient, $dentist, Appointment::STATUS_IN_PROGRESS);

        QueueItem::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'priority' => QueueItem::PRIORITY_SCHEDULED,
            'position' => 1,
            'status' => QueueItem::STATUS_IN_PROGRESS,
        ]);

        TreatmentEpisode::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'status' => TreatmentEpisode::STATUS_OPEN,
            'episode_type' => TreatmentEpisode::TYPE_TREATMENT,
        ]);

        $request = Request::create('/api/v1/dentist/queue/call-next', 'POST');
        $request->setUserResolver(fn() => $dentist);

        $response = (new QueueController())->callNext($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('OPEN_TREATMENT_EPISODE', $response->getData(true)['code']);
        $this->assertSame(Appointment::STATUS_IN_PROGRESS, $appointment->fresh()->status);
    }

    public function test_completion_blocker_blocks_unpaid_invoice(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->fixture();
        $appointment = $this->appointment($clinic, $branch, $patient, $dentist, Appointment::STATUS_IN_PROGRESS);

        Invoice::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'created_by' => $dentist->id,
            'invoice_number' => Invoice::generateNumber($clinic->id),
            'invoice_type' => Invoice::TYPE_TREATMENT,
            'lifecycle_status' => Invoice::STATUS_UNPAID,
            'status' => 'sent',
            'total' => 100,
            'paid' => 0,
            'balance' => 100,
            'issued_at' => now(),
            'due_date' => now()->addDays(7),
        ]);

        $blocker = $appointment->fresh('invoice')->completionBlocker();

        $this->assertSame('UNPAID_INVOICE', $blocker['code']);
        $this->assertSame(100.0, $blocker['balance']);
    }

    private function fixture(): array
    {
        $suffix = uniqid();

        $clinic = Clinic::create([
            'name' => "Queue Clinic {$suffix}",
            'subdomain' => "queue-{$suffix}",
            'email' => "queue-{$suffix}@example.test",
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
            'first_name' => 'Queue',
            'last_name' => 'Patient',
            'phone' => '555-0200',
            'status' => 'active',
        ]);

        return [$clinic, $branch, $patient, $dentist];
    }

    private function appointment(
        Clinic $clinic,
        Branch $branch,
        Patient $patient,
        User $dentist,
        string $status = Appointment::STATUS_CONFIRMED
    ): Appointment {
        return Appointment::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_time' => now()->addHour(),
            'duration_minutes' => 30,
            'type' => 'checkup',
            'status' => $status,
            'created_by' => $dentist->id,
        ]);
    }
}

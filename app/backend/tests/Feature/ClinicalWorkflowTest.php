<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\Dentist\ClinicalNoteController;
use App\Http\Controllers\Api\V1\Dentist\LabOrderController;
use App\Http\Controllers\Api\V1\Dentist\PrescriptionController;
use App\Http\Controllers\Api\V1\Dentist\TreatmentPlanController;
use App\Http\Controllers\Api\V1\Dentist\XRayController;
use App\Http\Controllers\Api\V1\Patient\MedicalRecordController as PatientMedicalRecordController;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\ClinicalNote;
use App\Models\LabOrder;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\TreatmentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClinicalWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    public function test_prescription_flow_creates_updates_finalizes_and_notifies_patient(): void
    {
        [$clinic, $branch, $patient, $dentist, $patientUser, $appointment] = $this->fixture();
        Notification::fake();

        $storeRequest = $this->request('POST', [
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'date' => now()->toDateString(),
            'notes' => 'After meals.',
            'items' => [[
                'drug_name' => 'Amoxicillin',
                'dosage' => '500mg',
                'frequency' => '3 times daily',
                'duration' => '5 days',
                'instructions' => 'Complete the course.',
            ]],
        ], $dentist);

        $created = (new PrescriptionController())->store($storeRequest);
        $this->assertSame(201, $created->getStatusCode());
        $prescriptionId = $created->getData(true)['data']['id'];

        $updateRequest = $this->request('PUT', [
            'items' => [[
                'drug_name' => 'Amoxicillin',
                'dosage' => '500mg',
                'frequency' => '2 times daily',
                'duration' => '7 days',
                'instructions' => 'Take with food.',
            ]],
        ], $dentist);

        $updated = (new PrescriptionController())->update($updateRequest, $prescriptionId);
        $this->assertSame('2 times daily', $updated->getData(true)['data']['items'][0]['frequency']);

        $finalized = (new PrescriptionController())->finalize($this->request('POST', [], $dentist), $prescriptionId);
        $this->assertSame('finalized', $finalized->getData(true)['data']['status']);
        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => User::class,
            'notifiable_id' => $patientUser->id,
            'type' => 'prescription_issued',
        ]);

        $print = (new PrescriptionController())->print($this->request('GET', [], $dentist), $prescriptionId);
        $this->assertTrue($print->getData(true)['data']['printable']);
    }

    public function test_xray_flow_uploads_securely_and_is_visible_in_patient_timeline(): void
    {
        Storage::fake('public');
        [$clinic, $branch, $patient, $dentist, $patientUser, $appointment] = $this->fixture();

        $request = $this->request('POST', [
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'description' => 'Bitewing image',
            'taken_at' => now()->toDateTimeString(),
            'study_type' => 'Bitewing',
        ], $dentist);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=');
        $path = tempnam(sys_get_temp_dir(), 'xray_') . '.png';
        file_put_contents($path, $png);
        $request->files->set('file', new UploadedFile($path, 'bitewing.png', 'image/png', null, true));

        $response = (new XRayController())->store($request);

        $this->assertSame(201, $response->getStatusCode());
        $data = $response->getData(true)['data'];
        Storage::disk('public')->assertExists($data['file_path']);
        $this->assertStringStartsWith('xrays/clinic-' . $clinic->id, $data['file_path']);

        $timeline = (new PatientMedicalRecordController())->index($this->request('GET', ['type' => 'xray'], $patientUser));
        $this->assertSame(1, $timeline->getData(true)['data']['summary']['xrays']);
    }

    public function test_manual_clinical_note_flow_creates_edits_signs_and_blocks_signed_edits(): void
    {
        [$clinic, $branch, $patient, $dentist, $patientUser, $appointment] = $this->fixture();
        $controller = new ClinicalNoteController();

        $created = $controller->store($this->request('POST', [
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'title' => 'Post-op note',
            'note' => 'Initial manual note.',
        ], $dentist));

        $noteId = $created->getData(true)['data']['id'];

        $updated = $controller->update($this->request('PUT', [
            'title' => 'Post-op note',
            'note' => 'Updated manual note.',
        ], $dentist), $noteId);
        $this->assertSame('Updated manual note.', $updated->getData(true)['data']['note']);

        $signed = $controller->sign($this->request('POST', [], $dentist), $noteId);
        $this->assertTrue($signed->getData(true)['data']['is_signed']);

        $blocked = $controller->update($this->request('PUT', [
            'note' => 'Should not overwrite.',
        ], $dentist), $noteId);
        $this->assertSame(422, $blocked->getStatusCode());
    }

    public function test_treatment_plan_and_lab_workflows_support_approval_delivery_and_acknowledgement(): void
    {
        [$clinic, $branch, $patient, $dentist, $patientUser, $appointment] = $this->fixture();

        $plan = TreatmentPlan::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'gp_id' => $dentist->id,
            'initial_appointment_id' => $appointment->id,
            'title' => 'Crown plan',
            'diagnosis' => 'Cracked molar',
            'status' => TreatmentPlan::STATUS_DRAFT,
            'estimated_cost' => 1500,
            'revision_number' => 1,
        ]);

        $planController = new TreatmentPlanController();
        $proposed = $planController->propose($this->request('POST', [], $dentist), $plan->id);
        $this->assertSame(TreatmentPlan::STATUS_PROPOSED, $proposed->getData(true)['data']['status']);

        $approved = $planController->approve($this->request('POST', [], $dentist), $plan->id);
        $this->assertSame(TreatmentPlan::STATUS_APPROVED, $approved->getData(true)['data']['status']);

        $labController = new LabOrderController();
        $created = $labController->store($this->request('POST', [
            'appointment_id' => $appointment->id,
            'treatment_plan_id' => $plan->id,
            'order_type' => 'crown',
            'material' => 'Zirconia',
            'instructions' => 'Shade A2',
        ], $dentist));
        $this->assertSame(201, $created->getStatusCode());
        $labOrderId = $created->getData(true)['data']['id'];

        $delivered = $labController->updateStatus($this->request('PUT', [
            'status' => 'delivered',
            'lab_notes' => 'Delivered to chairside.',
        ], $dentist), $labOrderId);
        $this->assertSame(LabOrder::STATUS_DELIVERED, $delivered->getData(true)['data']['status']);
        $this->assertNotNull($delivered->getData(true)['data']['delivered_at']);

        $ack = $labController->acknowledge($this->request('POST', [], $dentist), $labOrderId);
        $this->assertNotNull($ack->getData(true)['data']['dentist_acknowledged_at']);
    }

    public function test_patient_timeline_includes_appointments_prescriptions_notes_xrays_lab_orders_and_payments_bucket(): void
    {
        [$clinic, $branch, $patient, $dentist, $patientUser, $appointment] = $this->fixture();

        Prescription::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_id' => $appointment->id,
            'date' => now()->toDateString(),
            'issued_at' => now()->toDateString(),
            'status' => 'finalized',
            'medication' => 'Ibuprofen',
            'dosage' => '400mg',
            'duration_days' => 3,
        ]);

        ClinicalNote::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_id' => $appointment->id,
            'title' => 'Signed note',
            'note' => 'Patient doing well.',
            'note_type' => 'Signed note',
            'content' => 'Patient doing well.',
            'is_signed' => true,
            'signed_at' => now(),
        ]);

        LabOrder::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'ordering_dentist_id' => $dentist->id,
            'lab_order_number' => LabOrder::generateNumber($clinic->id),
            'order_type' => 'crown',
            'status' => LabOrder::STATUS_DELIVERED,
        ]);

        $response = (new PatientMedicalRecordController())->index($this->request('GET', [], $patientUser));
        $summary = $response->getData(true)['data']['summary'];

        $this->assertGreaterThanOrEqual(1, $summary['appointments']);
        $this->assertGreaterThanOrEqual(1, $summary['prescriptions']);
        $this->assertGreaterThanOrEqual(1, $summary['clinical_notes']);
        $this->assertGreaterThanOrEqual(1, $summary['lab_orders']);
        $this->assertArrayHasKey('payments', $summary);
    }

    private function request(string $method, array $data, User $user): Request
    {
        $request = Request::create('/test', $method, $data);
        $request->setUserResolver(fn() => $user);
        return $request;
    }

    private function fixture(): array
    {
        $suffix = uniqid();

        $clinic = Clinic::create([
            'name' => "Clinical Clinic {$suffix}",
            'subdomain' => "clinical-{$suffix}",
            'email' => "clinical-{$suffix}@example.test",
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

        $patientUser = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => 'patient',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'user_id' => $patientUser->id,
            'first_name' => 'Clinical',
            'last_name' => 'Patient',
            'email' => $patientUser->email,
            'phone' => '555-0300',
            'status' => 'active',
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_time' => now()->subHour(),
            'duration_minutes' => 30,
            'type' => 'checkup',
            'status' => Appointment::STATUS_IN_PROGRESS,
            'created_by' => $dentist->id,
        ]);

        return [$clinic, $branch, $patient, $dentist, $patientUser, $appointment];
    }
}

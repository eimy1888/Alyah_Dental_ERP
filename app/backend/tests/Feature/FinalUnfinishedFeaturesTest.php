<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\Clinic\AuditLogController;
use App\Http\Controllers\Api\V1\Clinic\DocumentController;
use App\Http\Controllers\Api\V1\Clinic\ReportsController;
use App\Http\Controllers\Api\V1\PatientTimelineController;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Document;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Patient;
use App\Models\Procedure;
use App\Models\Service;
use App\Models\User;
use App\Services\InventoryConsumptionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinalUnfinishedFeaturesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_document_center_uploads_archives_restores_and_audits(): void
    {
        Storage::fake('local');
        [$clinic, $branch, $patient, $admin] = $this->fixture();
        $controller = new DocumentController();

        $request = $this->request('POST', [
            'title' => 'Signed consent',
            'category' => 'clinical',
            'patient_id' => $patient->id,
        ], $admin);
        $request->files->set('file', UploadedFile::fake()->create('consent.pdf', 8, 'application/pdf'));

        $created = $controller->store($request);
        $this->assertSame(201, $created->getStatusCode());
        $documentId = $created->getData(true)['data']['id'];

        $this->assertDatabaseHas('documents', [
            'id' => $documentId,
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'is_archived' => false,
        ]);
        $this->assertDatabaseHas('audit_logs', ['event' => 'document.uploaded', 'subject_id' => $documentId]);

        $document = Document::findOrFail($documentId);
        Storage::disk('local')->assertExists($document->file_path);

        $archived = $controller->archive($this->request('POST', [], $admin), $document);
        $this->assertTrue($archived->getData(true)['data']['is_archived']);

        $restored = $controller->restore($this->request('POST', [], $admin), $document->fresh());
        $this->assertFalse($restored->getData(true)['data']['is_archived']);
    }

    public function test_unified_patient_timeline_includes_core_events(): void
    {
        [$clinic, $branch, $patient, $admin, $dentist, $appointment] = $this->fixtureWithDentist();

        Procedure::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'name' => 'Cleaning',
            'duration_minutes' => 30,
            'price' => 200,
            'status' => 'performed',
        ]);

        $response = (new PatientTimelineController())->show($this->request('GET', [], $admin), $patient->id);
        $data = $response->getData(true)['data'];

        $this->assertGreaterThanOrEqual(1, $data['summary']['appointment']);
        $this->assertGreaterThanOrEqual(1, $data['summary']['procedure']);
    }

    public function test_inventory_consumption_deducts_stock_and_records_traceable_transaction(): void
    {
        [$clinic, $branch, $patient, $admin, $dentist, $appointment] = $this->fixtureWithDentist();

        $service = Service::create([
            'clinic_id' => $clinic->id,
            'name' => 'Filling',
            'category' => 'restorative',
            'duration_minutes' => 30,
            'price' => 500,
        ]);

        $item = InventoryItem::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'name' => 'Composite',
            'sku' => 'CMP-' . uniqid(),
            'category' => 'consumables',
            'current_quantity' => 10,
            'reorder_threshold' => 3,
            'unit_cost' => 20,
            'is_active' => true,
        ]);

        $service->inventoryItems()->attach($item->id, ['quantity_used' => 2]);

        $procedure = Procedure::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'service_id' => $service->id,
            'name' => 'Filling',
            'duration_minutes' => 30,
            'price' => 500,
            'status' => 'performed',
        ]);

        (new InventoryConsumptionService())->consumeForProcedure($procedure, $dentist);

        $this->assertSame(8, $item->fresh()->current_quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'procedure_id' => $procedure->id,
            'inventory_item_id' => $item->id,
            'quantity_change' => -2,
        ]);

        (new InventoryConsumptionService())->restoreForProcedure($procedure, $dentist);
        $this->assertSame(10, $item->fresh()->current_quantity);
    }

    public function test_reports_summary_and_audit_export_are_filterable(): void
    {
        [$clinic, $branch, $patient, $admin] = $this->fixture();
        auth()->setUser($admin);

        AuditLog::record('staff.created', [
            'branch_id' => $branch->id,
            'clinic_id' => $clinic->id,
            'subject_type' => User::class,
            'subject_id' => $admin->id,
            'subject_label' => $admin->name,
        ], $this->request('POST', [], $admin), $admin);

        $export = (new AuditLogController())->export($this->request('GET', ['branch_id' => $branch->id], $admin));
        $this->assertNotEmpty($export->getData(true)['data']['rows']);

        $summary = (new ReportsController())->operationalSummary($this->request('GET', [
            'branch_id' => $branch->id,
            'from' => now()->subDay()->toDateString(),
            'to' => now()->addDay()->toDateString(),
        ], $admin));

        $this->assertArrayHasKey('revenue', $summary->getData(true)['data']);
        $this->assertArrayHasKey('clinical', $summary->getData(true)['data']);
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
            'name' => "Final Clinic {$suffix}",
            'subdomain' => "final-{$suffix}",
            'email' => "final-{$suffix}@example.test",
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

        $admin = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => 'clinic_admin',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'first_name' => 'Final',
            'last_name' => 'Patient',
            'phone' => '555-0400',
            'status' => 'active',
        ]);

        return [$clinic, $branch, $patient, $admin];
    }

    private function fixtureWithDentist(): array
    {
        [$clinic, $branch, $patient, $admin] = $this->fixture();

        $dentist = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'appointment_time' => now(),
            'duration_minutes' => 30,
            'type' => 'checkup',
            'status' => Appointment::STATUS_IN_PROGRESS,
            'created_by' => $dentist->id,
        ]);

        return [$clinic, $branch, $patient, $admin, $dentist, $appointment];
    }
}

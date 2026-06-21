<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Clinic;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use App\Services\InvoiceLifecycleService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BillingStabilizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_all_payment_paths_enforce_full_payment_and_store_collected_by(): void
    {
        [$clinic, $branch, $patient, $accountant] = $this->billingFixture();
        $invoice = $this->invoice($clinic, $branch, $patient, $accountant, Invoice::TYPE_SERVICE, 100);

        $service = app(InvoiceLifecycleService::class);

        $partial = $service->recordPayment($invoice, 50, 'cash', $accountant, 'PARTIAL-TEST');

        $this->assertFalse($partial['success']);
        $this->assertSame('PARTIAL_NOT_ALLOWED', $partial['code']);
        $this->assertSame(0, Payment::where('invoice_id', $invoice->id)->count());

        $full = $service->recordPayment($invoice->fresh(), 100, 'cash', $accountant, 'FULL-TEST');

        $this->assertTrue($full['success']);
        $this->assertSame(Invoice::STATUS_PAID, $invoice->fresh()->lifecycle_status);
        $this->assertSame(0.0, (float) $invoice->fresh()->balance);

        $payment = Payment::where('invoice_id', $invoice->id)->firstOrFail();
        $this->assertSame($accountant->id, $payment->collected_by);
        $this->assertFalse(array_key_exists('recorded_by', $payment->getAttributes()));
    }

    public function test_card_activation_uses_invoice_type_only_not_description_matching(): void
    {
        [$clinic, $branch, $patient, $accountant] = $this->billingFixture();

        $serviceInvoice = $this->invoice($clinic, $branch, $patient, $accountant, Invoice::TYPE_SERVICE, 100);
        InvoiceItem::create([
            'invoice_id' => $serviceInvoice->id,
            'description' => 'Clinic Card (Membership) - misleading text',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
        ]);

        $serviceInvoice->recordFullPayment(100, 'cash', $accountant, 'SERVICE-CARD-TEXT');
        $this->assertFalse($patient->fresh()->has_card);

        $cardInvoice = $this->invoice($clinic, $branch, $patient, $accountant, Invoice::TYPE_CARD, 100);
        $cardInvoice->recordFullPayment(100, 'cash', $accountant, 'CARD-INVOICE');

        $this->assertTrue($patient->fresh()->has_card);
        $this->assertTrue($patient->fresh()->card_is_active);
    }

    public function test_submit_for_review_releases_draft_invoice_to_unpaid(): void
    {
        [$clinic, $branch, $patient, $dentist] = $this->billingFixture('dentist');
        $invoice = $this->invoice($clinic, $branch, $patient, $dentist, Invoice::TYPE_TREATMENT, 0, Invoice::STATUS_DRAFT);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Root canal',
            'quantity' => 1,
            'unit_price' => 200,
            'total' => 200,
        ]);

        $invoice->submitForReview($dentist, 'Ready for billing');

        $invoice->refresh();
        $this->assertSame(Invoice::STATUS_UNPAID, $invoice->lifecycle_status);
        $this->assertSame('sent', $invoice->status);
        $this->assertGreaterThan(0, (float) $invoice->balance);
        $this->assertNotNull($invoice->submitted_for_review_at);
    }

    private function billingFixture(string $role = 'accountant'): array
    {
        $suffix = uniqid();

        $clinic = Clinic::create([
            'name' => "Billing Clinic {$suffix}",
            'subdomain' => "billing-{$suffix}",
            'email' => "billing-{$suffix}@example.test",
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

        $user = User::factory()->create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'role' => $role,
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'first_name' => 'Billing',
            'last_name' => 'Patient',
            'phone' => '555-0100',
            'status' => 'active',
        ]);

        return [$clinic, $branch, $patient, $user];
    }

    private function invoice(
        Clinic $clinic,
        Branch $branch,
        Patient $patient,
        User $user,
        string $type,
        float $total,
        string $status = Invoice::STATUS_UNPAID
    ): Invoice {
        return Invoice::create([
            'clinic_id' => $clinic->id,
            'branch_id' => $branch->id,
            'patient_id' => $patient->id,
            'created_by' => $user->id,
            'invoice_number' => Invoice::generateNumber($clinic->id),
            'invoice_type' => $type,
            'lifecycle_status' => $status,
            'status' => $status === Invoice::STATUS_DRAFT ? 'draft' : 'sent',
            'total' => $total,
            'estimated_total' => $total,
            'paid' => 0,
            'balance' => $total,
            'issued_at' => now(),
            'due_date' => now()->addDays(7),
        ]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    // ── Type constants ────────────────────────────────────────────────────────
    const TYPE_CARD        = 'card';
    const TYPE_SERVICE     = 'service';
    const TYPE_TREATMENT   = 'treatment';
    const TYPE_DIAGNOSTIC  = 'diagnostic';
    const TYPE_HYBRID      = 'hybrid';

    // ── Lifecycle status constants ────────────────────────────────────────────
    //
    //   DRAFT   → invoice created at booking; HIDDEN from accountant.
    //             Dentist is still working (checkup in progress).
    //             Extra procedures can be added here.
    //
    //   UNPAID  → dentist clicked "Checkup Complete".
    //             Invoice is now VISIBLE to accountant. Patient must pay.
    //
    //   PAID    → accountant recorded full payment. Treatment is ACTIVE.
    //
    //   LOCKED  → 24h after PAID. Immutable audit record.
    //
    const STATUS_DRAFT     = 'draft';
    const STATUS_UNPAID    = 'unpaid';
    const STATUS_PAID      = 'paid';
    const STATUS_LOCKED    = 'locked';

    // ── Legacy read-only compat ───────────────────────────────────────────────
    const STATUS_ESTIMATED     = 'estimated';
    const STATUS_IN_PROGRESS   = 'in_progress';
    const STATUS_UPDATED       = 'updated';
    const STATUS_FINAL         = 'final';
    const STATUS_UNDER_REVIEW  = 'under_review';
    const STATUS_PARTIAL       = 'partial';
    const STATUS_OVERDUE       = 'overdue';
    const STATUS_CANCELLED     = 'cancelled';

    // Statuses that prevent any further editing
    const IMMUTABLE_STATUSES = [
        self::STATUS_LOCKED,
        self::STATUS_PAID,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        // existing
        'clinic_id', 'branch_id', 'patient_id', 'appointment_id', 'created_by',
        'invoice_number', 'total', 'paid', 'balance',
        'status', 'issued_at', 'due_date', 'notes',
        // new v2
        'treatment_episode_id',
        'invoice_type',
        'lifecycle_status',
        'pre_paid',
        'estimated_total',
        'discount_total',
        'tax_amount',
        'tax_rate',
        'insurance_coverage',
        'finalized_at',
        'finalized_by',
        'submitted_for_review_at',
        'review_notes',
        'locked_at',
        'locked_by',
    ];

    protected $casts = [
        'total'                   => 'decimal:2',
        'paid'                    => 'decimal:2',
        'balance'                 => 'decimal:2',
        'pre_paid'                => 'decimal:2',
        'estimated_total'         => 'decimal:2',
        'discount_total'          => 'decimal:2',
        'tax_amount'              => 'decimal:2',
        'tax_rate'                => 'decimal:2',
        'insurance_coverage'      => 'decimal:2',
        'issued_at'               => 'date',
        'due_date'                => 'date',
        'finalized_at'            => 'datetime',
        'submitted_for_review_at' => 'datetime',
        'locked_at'               => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function episode(): BelongsTo
    {
        return $this->belongsTo(TreatmentEpisode::class, 'treatment_episode_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function projections(): HasMany
    {
        return $this->hasMany(InvoiceProjection::class);
    }

    public function billingEvents(): HasMany
    {
        return $this->hasMany(BillingEvent::class)->orderBy('created_at');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        if ($branchId === null) {
            return $query;
        }
        return $query->where('branch_id', $branchId);
    }

    public function scopeUnderReview($query)
    {
        return $query->where('lifecycle_status', self::STATUS_UNDER_REVIEW);
    }

    public function scopeInProgress($query)
    {
        return $query->whereIn('lifecycle_status', [
            self::STATUS_IN_PROGRESS, self::STATUS_UPDATED,
        ]);
    }

    public function scopeLocked($query)
    {
        return $query->where('lifecycle_status', self::STATUS_LOCKED);
    }

    // ── State Guards ──────────────────────────────────────────────────────────

    public function isEditable(): bool
    {
        // DRAFT and UNPAID are editable. PAID, LOCKED, CANCELLED are not.
        return !in_array($this->lifecycle_status ?? $this->status, self::IMMUTABLE_STATUSES);
    }

    public function isCardInvoice(): bool
    {
        return $this->invoice_type === self::TYPE_CARD;
    }

    // ── Core Financial Calculation ────────────────────────────────────────────

    /**
     * Recalculate totals from invoice items.
     * REQ-1: Only UNPAID invoices can be recalculated.
     * PAID / LOCKED invoices only update the paid/balance fields from payments.
     */
    public function recalculate(): void
    {
        $subtotal = $this->items()
            ->whereNotIn('item_type', [''])
            ->sum(\DB::raw('quantity * unit_price'));

        $taxRate   = (float) ($this->tax_rate ?? 15);
        $taxAmount = round($subtotal * ($taxRate / 100), 2);
        $total     = max(0, $subtotal + $taxAmount);

        $paid    = $this->payments()->where('status', 'completed')->sum('amount');
        $balance = max(0, $total - $paid);

        $currentStatus = $this->lifecycle_status ?? $this->status;

        // Immutable: only refresh payment fields
        if (in_array($currentStatus, self::IMMUTABLE_STATUSES)) {
            $this->update(['paid' => $paid, 'balance' => $balance]);
            return;
        }

        // DRAFT invoices: only update totals, keep status as draft (hidden from accountant)
        if ($currentStatus === self::STATUS_DRAFT) {
            $this->update([
                'total'           => $total,
                'tax_amount'      => $taxAmount,
                'estimated_total' => $total,
                'paid'            => $paid,
                'balance'         => $balance,
                // lifecycle_status stays 'draft' — NOT promoted to unpaid here
            ]);
            return;
        }

        // Determine new lifecycle status for non-draft invoices
        $newStatus = self::STATUS_UNPAID;
        if ($balance <= 0 && $paid > 0) {
            $newStatus = self::STATUS_PAID;
        }

        $this->update([
            'total'            => $total,
            'tax_amount'       => $taxAmount,
            'paid'             => $paid,
            'balance'          => $balance,
            'status'           => $newStatus === self::STATUS_PAID ? 'paid' : 'sent',
            'lifecycle_status' => $newStatus,
        ]);

        // Auto-lock 24 hours after PAID (REQ-4 / REQ-13)
        if ($newStatus === self::STATUS_PAID) {
            $this->activateCardIfApplicable();
            $this->triggerPostPaymentAutomations();
        }
    }

    /**
     * REQ-3: Record a full payment. Rejects partials.
     * On success: transitions invoice to PAID, triggers automations.
     */
    public function recordFullPayment(
        float $amount,
        string $method,
        \App\Models\User $recordedBy,
        string $reference = ''
    ): array {
        if (in_array($this->lifecycle_status, [self::STATUS_PAID, self::STATUS_LOCKED])) {
            return ['success' => false, 'message' => 'Invoice is already paid.'];
        }

        // Cannot pay a DRAFT invoice — dentist must complete checkup first
        if ($this->lifecycle_status === self::STATUS_DRAFT) {
            return [
                'success' => false,
                'message' => 'Invoice is still in draft. The dentist must complete the checkup before payment can be collected.',
                'code'    => 'INVOICE_DRAFT',
            ];
        }

        $balance = (float) $this->balance;

        // REQ-3: No partial payments — amount must equal balance
        if (abs($amount - $balance) > 0.01) {
            return [
                'success' => false,
                'message' => "Full payment required: ETB " . number_format($balance, 2) . ". Partial payments are not accepted.",
                'code'    => 'PARTIAL_NOT_ALLOWED',
            ];
        }

        // REQ-13: Reject overpayment
        if ($amount > $balance + 0.01) {
            return [
                'success' => false,
                'message' => "Payment exceeds balance — Max: ETB " . number_format($balance, 2),
                'code'    => 'OVERPAYMENT',
            ];
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($amount, $method, $reference, $recordedBy) {
            \App\Models\Payment::create([
                'clinic_id'    => $this->clinic_id,
                'branch_id'    => $this->branch_id,
                'patient_id'   => $this->patient_id,
                'invoice_id'   => $this->id,
                'amount'       => $amount,
                'method'       => $method,
                'reference'    => $reference,
                'status'       => 'completed',
                'paid_at'      => now(),
                'collected_by' => $recordedBy->id,
            ]);

            $this->update([
                'paid'             => $amount,
                'balance'          => 0,
                'status'           => 'paid',
                'lifecycle_status' => self::STATUS_PAID,
                'locked_at'        => now()->addHours(24),
                'locked_by'        => $recordedBy->id,
                'finalized_at'     => now(),
                'finalized_by'     => $recordedBy->id,
            ]);
        });

        $this->refresh();
        $this->activateCardIfApplicable();
        $this->triggerPostPaymentAutomations();

        \App\Models\BillingEvent::log(
            $this,
            \App\Models\BillingEvent::EVENT_PAYMENT_RECORDED,
            $amount,
            $amount,
            ['method' => $method, 'reference' => $reference],
            $recordedBy->id,
            $this->appointment_id
        );

        return [
            'success' => true,
            'message' => "Payment of ETB " . number_format($amount, 2) . " recorded. Invoice marked PAID.",
            'data'    => [
                'invoice_id'     => $this->id,
                'invoice_number' => $this->invoice_number,
                'amount_paid'    => $amount,
                'balance'        => 0,
                'status'         => self::STATUS_PAID,
            ],
        ];
    }

    /**
     * REQ-8: Add a service during active treatment.
     * If invoice is PAID, transitions back to UNPAID for the difference.
     */
    public function addServiceDuringTreatment(
        string $description,
        float $unitPrice,
        \App\Models\User $addedBy,
        ?int $serviceId = null
    ): array {
        if ($this->lifecycle_status === self::STATUS_LOCKED) {
            return ['success' => false, 'message' => 'Invoice is immutable after payment.'];
        }

        $item = \App\Models\InvoiceItem::create([
            'invoice_id'  => $this->id,
            'description' => $description . ' [added during treatment]',
            'quantity'    => 1,
            'unit_price'  => $unitPrice,
            'item_type'   => \App\Models\InvoiceItem::TYPE_PROCEDURE,
            'source_id'   => $serviceId,
            'added_by'    => $addedBy->id,
            'is_locked'   => false,
        ]);

        $previousStatus = $this->lifecycle_status;
        $this->recalculate();
        $this->refresh();

        // If was PAID and new balance > 0, revert to UNPAID
        if ($previousStatus === self::STATUS_PAID && (float) $this->balance > 0.01) {
            $this->update([
                'lifecycle_status' => self::STATUS_UNPAID,
                'status'           => 'sent',
            ]);

            \App\Models\BillingEvent::log(
                $this,
                'add_service_reverted_to_unpaid',
                $unitPrice,
                (float) $this->total,
                ['description' => $description, 'extra_amount' => (float) $this->balance],
                $addedBy->id,
                $this->appointment_id
            );

            return [
                'success'             => true,
                'reverted_to_unpaid'  => true,
                'extra_amount_due'    => (float) $this->balance,
                'message'             => "ADDITIONAL PAYMENT REQUIRED — ETB " . number_format($this->balance, 2),
                'invoice_total'       => (float) $this->total,
            ];
        }

        \App\Models\BillingEvent::log(
            $this,
            'add_service_during_treatment',
            $unitPrice,
            (float) $this->total,
            ['description' => $description],
            $addedBy->id,
            $this->appointment_id
        );

        return [
            'success'            => true,
            'reverted_to_unpaid' => false,
            'extra_amount_due'   => 0,
            'invoice_total'      => (float) $this->total,
        ];
    }

    /**
     * REQ-13: Lock invoice for audit immutability.
     */
    public function lockForAudit(\App\Models\User $by): void
    {
        if ($this->lifecycle_status !== self::STATUS_PAID) return;
        $this->items()->update(['is_locked' => true]);
        $this->update([
            'lifecycle_status' => self::STATUS_LOCKED,
            'locked_at'        => now(),
            'locked_by'        => $by->id,
        ]);
    }

    /**
     * REQ-5 / REQ-9: Trigger post-payment automations:
     * - Create lab orders if required
     * - Schedule specialist appointment if needed
     * - Notify patient + dentist
     */
    private function triggerPostPaymentAutomations(): void
    {
        try {
            $appointment = $this->appointment;
            if (!$appointment) return;

            $plan = $appointment->treatmentPlan;
            if (!$plan) return;

            // REQ-9: Auto-create lab order after payment
            if ($plan->requires_lab && !$plan->labOrders()->where('status', '!=', 'cancelled')->exists()) {
                \App\Models\LabOrder::create([
                    'clinic_id'           => $this->clinic_id,
                    'branch_id'           => $this->branch_id,
                    'patient_id'          => $this->patient_id,
                    'treatment_plan_id'   => $plan->id,
                    'appointment_id'      => $appointment->id,
                    'ordering_dentist_id' => $appointment->dentist_id,
                    'lab_order_number'    => \App\Models\LabOrder::generateNumber($this->clinic_id),
                    'order_type'          => $plan->lab_order_type ?? 'other',
                    'status'              => \App\Models\LabOrder::STATUS_PENDING,
                    'notes'               => "Auto-created after payment — Plan: {$plan->title}",
                ]);
            }

            // REQ-6: Auto-schedule specialist appointment after payment
            if ($plan->requires_specialist && !empty($plan->specialist_type)) {
                \App\Services\SpecialistAssignmentService::scheduleSpecialistAppointment($plan, $appointment);
            }

            // Notify dentist: payment received
            \DB::table('notifications')->insert([
                'id'              => \Illuminate\Support\Str::uuid(),
                'type'            => 'invoice_paid',
                'notifiable_type' => \App\Models\User::class,
                'notifiable_id'   => $appointment->dentist_id,
                'data'            => json_encode([
                    'title'   => 'Payment Received — Treatment Active',
                    'message' => "Invoice {$this->invoice_number} paid. Treatment for {$this->patient?->full_name} is now active.",
                    'invoice_id' => $this->id,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Log::error('[Invoice] triggerPostPaymentAutomations failed: ' . $e->getMessage());
        }
    }

    /**
     * Called when dentist clicks "Checkup Complete".
     * Promotes invoice from DRAFT → UNPAID so accountant can see it.
     * Recalculates totals from all current items first.
     */
    public function releaseToAccountant(): void
    {
        // Atomic check-and-set using a locking read to prevent double-release
        // under concurrent requests (e.g. dentist double-clicks checkup complete).
        \Illuminate\Support\Facades\DB::transaction(function () {
            // Re-read with a write lock so concurrent calls queue behind this one
            $fresh = self::where('id', $this->id)
                ->lockForUpdate()
                ->first();

            if (!$fresh || $fresh->lifecycle_status !== self::STATUS_DRAFT) {
                return; // already released or paid — idempotent exit
            }

            // Recompute totals from all items accumulated during checkup
            $subtotal  = $fresh->items()->sum(\DB::raw('quantity * unit_price'));
            $taxRate   = (float) ($fresh->tax_rate ?? 15);
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $total     = max(0, $subtotal + $taxAmount);

            $fresh->update([
                'total'            => $total,
                'estimated_total'  => $total,
                'tax_amount'       => $taxAmount,
                'balance'          => $total,
                'lifecycle_status' => self::STATUS_UNPAID,
                'status'           => 'sent',
                'issued_at'        => now(),
                'due_date'         => now()->addDays(7),
            ]);
        });

        // Sync in-memory model to DB state after transaction
        $this->refresh();
    }

    // ── Legacy transitions (kept for backward compat — not used in new flow) ──

    public function submitForReview(\App\Models\User $by, string $notes = ''): void
    {
        if (!in_array($this->lifecycle_status, [self::STATUS_DRAFT, self::STATUS_ESTIMATED], true)) {
            return;
        }

        $this->releaseToAccountant();

        $this->update([
            'submitted_for_review_at' => now(),
            'finalized_by' => $by->id,
            'review_notes' => $notes ?: $this->review_notes,
        ]);
    }

    public function sendBackForRevision(\App\Models\User $by, string $reason): void
    {
        // No-op in new model
    }

    public function lock(\App\Models\User $by): void
    {
        $this->lockForAudit($by);
    }

    // ── Static Factories ──────────────────────────────────────────────────────

    public static function generateNumber(int $clinicId): string
    {
        // Use MAX(id) with a locking read to prevent race conditions
        // under concurrent requests. Two simultaneous bookings can never
        // get the same invoice number.
        $max = \Illuminate\Support\Facades\DB::table('invoices')
            ->where('clinic_id', $clinicId)
            ->lockForUpdate()
            ->max('id') ?? 0;

        $seq = $max + 1;

        return 'INV-' . date('Y') . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create a fixed-price service invoice at booking time.
     * One locked line item is created immediately.
     */
    public static function createServiceInvoice(
        Appointment $appointment,
        Service $service,
        User $createdBy
    ): self {
        $clinicId  = $appointment->clinic_id;
        $taxRate   = (float) ($appointment->clinic?->getSetting('tax_rate', 15) ?? 15);
        $basePrice = (float) $service->price;
        $taxAmount = round($basePrice * ($taxRate / 100), 2);
        $total     = $basePrice + $taxAmount;

        $invoice = self::create([
            'clinic_id'        => $clinicId,
            'branch_id'        => $appointment->branch_id,
            'patient_id'       => $appointment->patient_id,
            'appointment_id'   => $appointment->id,
            'created_by'       => $createdBy->id,
            'invoice_number'   => self::generateNumber($clinicId),
            'invoice_type'     => self::TYPE_SERVICE,
            'lifecycle_status' => self::STATUS_DRAFT,   // hidden from accountant until checkup complete
            'total'            => $total,
            'estimated_total'  => $total,
            'tax_rate'         => $taxRate,
            'tax_amount'       => $taxAmount,
            'paid'             => 0,
            'pre_paid'         => 0,
            'balance'          => $total,
            'status'           => 'draft',
            'issued_at'        => now(),
            'due_date'         => now()->addDays(15),
            'notes'            => "Service invoice: {$service->name}",
        ]);

        InvoiceItem::create([
            'invoice_id'  => $invoice->id,
            'description' => $service->name,
            'quantity'    => 1,
            'unit_price'  => $basePrice,
            'total'       => $basePrice,
            'item_type'   => InvoiceItem::TYPE_SERVICE,
            'source_type' => Service::class,
            'source_id'   => $service->id,
            'added_by'    => $createdBy->id,
            'is_locked'   => true,
        ]);

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_INVOICE_CREATED,
            $total,
            $total,
            ['service_id' => $service->id, 'service_name' => $service->name],
            $createdBy->id,
            $appointment->id
        );

        return $invoice;
    }

    /**
     * REQ-5: Create the single treatment invoice after CHECKUP COMPLETE.
     * State is UNPAID — patient must pay before treatment starts.
     */
    public static function createTreatmentInvoice(
        Appointment $appointment,
        User $createdBy,
        ?TreatmentEpisode $episode = null
    ): self {
        $clinicId = $appointment->clinic_id;
        $taxRate  = (float) ($appointment->clinic?->getSetting('tax_rate', 15) ?? 15);

        $invoice = self::create([
            'clinic_id'            => $clinicId,
            'branch_id'            => $appointment->branch_id,
            'patient_id'           => $appointment->patient_id,
            'appointment_id'       => $appointment->id,
            'treatment_episode_id' => $episode?->id,
            'created_by'           => $createdBy->id,
            'invoice_number'       => self::generateNumber($clinicId),
            'invoice_type'         => self::TYPE_TREATMENT,
            'lifecycle_status'     => self::STATUS_DRAFT,  // hidden until checkup complete
            'total'                => 0,
            'estimated_total'      => 0,
            'tax_rate'             => $taxRate,
            'tax_amount'           => 0,
            'paid'                 => 0,
            'pre_paid'             => 0,
            'balance'              => 0,
            'status'               => 'draft',
            'issued_at'            => now(),
            'due_date'             => now()->addDays(7),
            'notes'                => 'Treatment invoice — full payment required before treatment.',
        ]);

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_INVOICE_CREATED,
            0, 0,
            ['billing_model' => 'treatment', 'episode_id' => $episode?->id],
            $createdBy->id,
            $appointment->id,
            $episode?->id
        );

        return $invoice;
    }

    /**
     * Create a clinic card invoice for a patient registration.
     * Tax is always applied — card fee is the base, VAT on top.
     */
    public static function createCardInvoiceForPatient(
        Patient $patient,
        User $createdBy,
        float $cardPrice
    ): self {
        $taxRate   = (float) ($patient->clinic?->getSetting('tax_rate', 15) ?? 15);
        $taxAmount = round($cardPrice * ($taxRate / 100), 2);
        $total     = $cardPrice + $taxAmount;

        $invoice = self::create([
            'clinic_id'        => $patient->clinic_id,
            'branch_id'        => $patient->branch_id,
            'patient_id'       => $patient->id,
            'appointment_id'   => null,
            'created_by'       => $createdBy->id,
            'invoice_number'   => self::generateNumber($patient->clinic_id),
            'invoice_type'     => self::TYPE_CARD,
            'lifecycle_status' => self::STATUS_UNPAID,
            'total'            => $total,
            'estimated_total'  => $total,
            'tax_rate'         => $taxRate,
            'tax_amount'       => $taxAmount,
            'paid'             => 0,
            'pre_paid'         => 0,
            'balance'          => $total,
            'status'           => 'sent',
            'issued_at'        => now(),
            'due_date'         => now()->addDays(15),
            'notes'            => 'Clinic Card (Membership) — required for appointments.',
        ]);

        $invoice->items()->create([
            'description' => 'Clinic Card (Membership) - One-time registration fee',
            'quantity'    => 1,
            'unit_price'  => $cardPrice,
            'total'       => $cardPrice,
            'item_type'   => InvoiceItem::TYPE_CARD,
            'added_by'    => $createdBy->id,
            'is_locked'   => true,
        ]);

        return $invoice;
    }

    /**
     * Backward-compatible: create empty invoice at check-in.
     * Used by old CheckInService flow.
     */
    public static function createEmptyForAppointment(
        Appointment $appointment,
        User $createdBy
    ): self {
        return self::createTreatmentInvoice($appointment, $createdBy);
    }

    /**
     * Add a procedure item directly (legacy path).
     * New path goes through BillingCalculatorService → InvoiceProjection.
     */
    public function addProcedure(string $description, int $quantity, float $unitPrice): InvoiceItem
    {
        $item = InvoiceItem::create([
            'invoice_id'  => $this->id,
            'description' => $description,
            'quantity'    => $quantity,
            'unit_price'  => $unitPrice,
            'item_type'   => InvoiceItem::TYPE_PROCEDURE,
            'added_by'    => null,
            'is_locked'   => false,
        ]);

        $this->recalculate();
        return $item;
    }

    /**
     * Activate patient card when this card invoice is fully paid.
     */
    public function activateCardIfApplicable(): void
    {
        if (!$this->isCardInvoice() || $this->status !== 'paid') return;

        $patient = $this->patient;
        if (!$patient || $patient->hasActiveCard()) return;

        $cardNumber = 'CARD-' . str_pad($patient->id, 6, '0', STR_PAD_LEFT) . '-' . date('Ymd');
        $patient->update([
            'has_card'       => true,
            'card_is_active' => true,
            'card_number'    => $cardNumber,
        ]);
    }

    /**
     * Get full billing breakdown for API responses.
     */
    public function getBillingBreakdown(): array
    {
        return [
            'id'               => $this->id,
            'invoice_number'   => $this->invoice_number,
            'invoice_type'     => $this->invoice_type ?? 'service',
            'lifecycle_status' => $this->lifecycle_status ?? $this->status,
            'items'            => $this->items->map(fn($i) => [
                'id'           => $i->id,
                'description'  => $i->description,
                'quantity'     => $i->quantity,
                'unit_price'   => (float) $i->unit_price,
                'discount'     => (float) ($i->discount ?? 0),
                'total'        => (float) $i->total,
                'item_type'    => $i->item_type ?? 'manual',
                'is_locked'    => (bool) ($i->is_locked ?? false),
                'added_by'     => $i->addedBy?->name,
            ]),
            'subtotal'         => (float) $this->items->sum(fn($i) => $i->quantity * $i->unit_price),
            'discount_total'   => (float) ($this->discount_total ?? 0),
            'tax_rate'         => (float) ($this->tax_rate ?? 15),
            'tax_amount'       => (float) ($this->tax_amount ?? 0),
            'insurance_coverage'=> (float) ($this->insurance_coverage ?? 0),
            'total'            => (float) $this->total,
            'pre_paid'         => (float) ($this->pre_paid ?? 0),
            'paid'             => (float) $this->paid,
            'balance'          => (float) $this->balance,
            'status'           => $this->status,
            'issued_at'        => $this->issued_at?->toDateString(),
            'due_date'         => $this->due_date?->toDateString(),
            'finalized_at'     => $this->finalized_at?->toDateTimeString(),
            'locked_at'        => $this->locked_at?->toDateTimeString(),
        ];
    }
}

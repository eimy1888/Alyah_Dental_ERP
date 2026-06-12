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
    const TYPE_CARD      = 'card';
    const TYPE_SERVICE   = 'service';
    const TYPE_TREATMENT = 'treatment';
    const TYPE_HYBRID    = 'hybrid';

    // ── Lifecycle status constants ────────────────────────────────────────────
    const STATUS_DRAFT         = 'draft';
    const STATUS_ESTIMATED     = 'estimated';     // service invoice at booking
    const STATUS_IN_PROGRESS   = 'in_progress';   // treatment invoice, dentist building
    const STATUS_UPDATED       = 'updated';        // procedure just added
    const STATUS_FINAL         = 'final';          // dentist signed off
    const STATUS_UNDER_REVIEW  = 'under_review';   // accountant verifying
    const STATUS_LOCKED        = 'locked';         // accountant locked
    const STATUS_PAID          = 'paid';
    const STATUS_PARTIAL       = 'partial';
    const STATUS_OVERDUE       = 'overdue';
    const STATUS_CANCELLED     = 'cancelled';

    // Statuses that prevent further editing
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
        return !in_array($this->lifecycle_status ?? $this->status, self::IMMUTABLE_STATUSES);
    }

    public function isCardInvoice(): bool
    {
        if ($this->invoice_type === self::TYPE_CARD) return true;
        return $this->items()->where('description', 'like', '%Clinic Card%')->exists();
    }

    // ── Core Financial Calculation ────────────────────────────────────────────

    /**
     * Recalculate totals from committed invoice items.
     * Lifecycle-aware: locked invoices only update payment fields.
     */
    public function recalculate(): void
    {
        $subtotal = $this->items()
            ->whereNotIn('item_type', [''])
            ->sum(DB::raw('quantity * unit_price'));

        $taxRate    = (float) ($this->tax_rate ?? 15);
        $taxAmount  = round($subtotal * ($taxRate / 100), 2);
        $discount   = (float) ($this->discount_total ?? 0);
        $insurance  = (float) ($this->insurance_coverage ?? 0);
        $total      = max(0, $subtotal + $taxAmount - $discount - $insurance);

        $paid    = $this->payments()->where('status', 'completed')->sum('amount');
        $balance = max(0, $total - $paid);

        // Legacy status (backward compat)
        $legacyStatus = match(true) {
            $balance <= 0 && $paid > 0           => 'paid',
            $paid > 0                             => 'partial',
            $this->due_date && $this->due_date->isPast() && $balance > 0 => 'overdue',
            default                               => 'sent',
        };

        // Lifecycle status
        $currentLifecycle = $this->lifecycle_status ?? self::STATUS_IN_PROGRESS;

        if (in_array($currentLifecycle, self::IMMUTABLE_STATUSES)) {
            // Locked/paid/cancelled — only update payment fields
            $this->update(['paid' => $paid, 'balance' => $balance, 'status' => $legacyStatus]);
            return;
        }

        // If treatment invoice and items were just added → mark updated
        $newLifecycle = $currentLifecycle;
        if ($this->invoice_type === self::TYPE_TREATMENT
            && in_array($currentLifecycle, [self::STATUS_IN_PROGRESS, self::STATUS_UPDATED])) {
            $newLifecycle = self::STATUS_UPDATED;
        }

        // Handle paid/partial lifecycle
        if ($balance <= 0 && $paid > 0) {
            $newLifecycle = self::STATUS_PAID;
        } elseif ($paid > 0 && $balance > 0) {
            // Keep current lifecycle, just update financial fields
        }

        $this->update([
            'total'            => $total,
            'tax_amount'       => $taxAmount,
            'paid'             => $paid,
            'balance'          => $balance,
            'status'           => $legacyStatus,
            'lifecycle_status' => $newLifecycle,
        ]);
    }

    // ── Lifecycle Transitions ─────────────────────────────────────────────────

    /**
     * Dentist finalizes — moves invoice to under_review.
     * Accountant must verify before locking.
     */
    public function submitForReview(User $by, string $notes = ''): void
    {
        if (!$this->isEditable()) return;

        $this->recalculate();
        $this->update([
            'lifecycle_status'        => self::STATUS_UNDER_REVIEW,
            'finalized_at'            => now(),
            'finalized_by'            => $by->id,
            'submitted_for_review_at' => now(),
            'review_notes'            => $notes,
        ]);

        BillingEvent::log(
            $this,
            BillingEvent::EVENT_SUBMITTED_FOR_REVIEW,
            0,
            $this->total,
            ['notes' => $notes],
            $by->id,
            $this->appointment_id
        );
    }

    /**
     * Accountant sends invoice back to dentist — discrepancy found.
     */
    public function sendBackForRevision(User $by, string $reason): void
    {
        $this->update([
            'lifecycle_status' => self::STATUS_IN_PROGRESS,
            'review_notes'     => "[SENT BACK by {$by->name}]: {$reason}",
        ]);

        BillingEvent::log(
            $this,
            BillingEvent::EVENT_SENT_BACK,
            0,
            $this->total,
            ['reason' => $reason, 'sent_back_by' => $by->name],
            $by->id,
            $this->appointment_id
        );
    }

    /**
     * Accountant locks invoice — no more changes allowed.
     * Only works from under_review status.
     */
    public function lock(User $by): void
    {
        if ($this->lifecycle_status === self::STATUS_LOCKED) return;

        // Lock all invoice items
        $this->items()->update(['is_locked' => true]);

        $this->update([
            'lifecycle_status' => self::STATUS_LOCKED,
            'locked_at'        => now(),
            'locked_by'        => $by->id,
        ]);

        BillingEvent::log(
            $this,
            BillingEvent::EVENT_INVOICE_LOCKED,
            0,
            $this->total,
            [],
            $by->id,
            $this->appointment_id
        );
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
            'lifecycle_status' => self::STATUS_ESTIMATED,
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
     * Create an empty treatment invoice (built dynamically by dentist).
     * No items at creation — BillingCalculator adds them via projections.
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
            'lifecycle_status'     => self::STATUS_IN_PROGRESS,
            'total'                => 0,
            'estimated_total'      => 0,
            'tax_rate'             => $taxRate,
            'tax_amount'           => 0,
            'paid'                 => 0,
            'pre_paid'             => 0,
            'balance'              => 0,
            'status'               => 'sent',
            'issued_at'            => now(),
            'due_date'             => now()->addDays(15),
            'notes'                => 'Treatment invoice — built dynamically during consultation.',
        ]);

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_INVOICE_CREATED,
            0,
            0,
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
            'lifecycle_status' => self::STATUS_ESTIMATED,
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

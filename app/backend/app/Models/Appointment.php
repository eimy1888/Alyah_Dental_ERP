<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

use App\Helpers\EthiopianTime;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    // ── Billing model constants ───────────────────────────────────────────────
    const BILLING_SERVICE   = 'service';
    const BILLING_TREATMENT = 'treatment';
    const BILLING_HYBRID    = 'hybrid';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'dentist_id',
        'appointment_time',
        'duration_minutes',
        'type',
        'status',
        'notes',
        'queue_position',
        'rescheduled_from',
        'reschedule_count',
        'created_by',
        'is_notified',
        'check_in_time',
        'start_time',
        'end_time',
        'is_late',
        'late_minutes',
        // v2 billing fields
        'billing_model',
        'service_id',
        'service_invoice_id',
        'treatment_invoice_id',
    ];

    protected $casts = [
        'appointment_time'  => 'datetime',
        'rescheduled_from'  => 'datetime',
        'is_notified'       => 'boolean',
        'duration_minutes'  => 'integer',
        'queue_position'    => 'integer',
        'reschedule_count'  => 'integer',
        'check_in_time'     => 'datetime',
        'start_time'        => 'datetime',
        'end_time'          => 'datetime',
        'is_late'           => 'boolean',
        'late_minutes'      => 'integer',
    ];

    // ── Status constants ───────────────────────────────────
    const STATUS_PENDING     = 'pending';
    const STATUS_CONFIRMED   = 'confirmed';
    const STATUS_CHECKED_IN  = 'checked_in';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED   = 'completed';
    const STATUS_NO_SHOW     = 'no_show';
    const STATUS_CANCELLED   = 'cancelled';

    // ── Relationships ──────────────────────────────────────

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function dentist()
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function xRays()
    {
        return $this->hasMany(XRay::class);
    }

    public function clinicalNotes()
    {
        return $this->hasMany(ClinicalNote::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function queueItem()
    {
        return $this->hasOne(QueueItem::class);
    }

    public function recalls()
    {
        return $this->hasMany(Recall::class);
    }

    // ── v2 Billing relationships ──────────────────────────────────────────────

    public function service(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function serviceInvoice(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'service_invoice_id');
    }

    public function treatmentInvoice(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'treatment_invoice_id');
    }

    public function episodes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(TreatmentEpisode::class)->orderBy('phase_number');
    }

    // ── Scopes ────────────────────────────────────────────

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

    public function scopeForDentist($query, int $dentistId)
    {
        return $query->where('dentist_id', $dentistId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('appointment_time', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('appointment_time', [
            now()->startOfWeek(),
            now()->endOfWeek(),
        ]);
    }

    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeUnnotified($query, int $dentistId)
    {
        return $query->where('dentist_id', $dentistId)
                     ->where('created_by', '!=', $dentistId)
                     ->where('is_notified', false);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->whereHas('patient', function ($q) use ($term) {
            $q->where('first_name', 'like', "%{$term}%")
              ->orWhere('last_name',  'like', "%{$term}%");
        });
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    public function scopeCheckedIn($query)
    {
        return $query->where('status', self::STATUS_CHECKED_IN);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeNoShow($query)
    {
        return $query->where('status', self::STATUS_NO_SHOW);
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', self::STATUS_CANCELLED);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    // ── Helper Methods ─────────────────────────────────────

    public function getEndTimeAttribute()
    {
        return $this->appointment_time
            ->addMinutes($this->duration_minutes);
    }

    // Add this with the other relationships
        public function procedures()
        {
            return $this->hasMany(Procedure::class)->orderBy('created_at');
        }



    public function getIsToday(): bool
    {
        return $this->appointment_time->isToday();
    }

    public function getIsUpcoming(): bool
    {
        return $this->appointment_time->isFuture() && !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW]);
    }

    public function getIsPast(): bool
    {
        return $this->appointment_time->isPast() && !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW]);
    }

    /**
     * Check if appointment requires invoice on check-in
     * Returns true if patient does NOT have an active clinic card
     */
    public function requiresInvoiceOnCheckIn(): bool
    {
        $patient = $this->patient;
        
        if (!$patient) {
            return true;
        }
        
        // If patient has active clinic card, no invoice needed
        if ($patient->hasActiveCard()) {
            return false;
        }
        
        return true;
    }

    /**
     * Get or create invoice for this appointment
     * Used during check-in when no active card
     */
    public function getOrCreateInvoice(): ?Invoice
    {
        // Check if invoice already exists
        if ($this->invoice) {
            return $this->invoice;
        }
        
        // Don't create invoice if patient has active card
        if (!$this->requiresInvoiceOnCheckIn()) {
            return null;
        }
        
        // Find service for this appointment type
        $service = Service::where('clinic_id', $this->clinic_id)
            ->where('name', 'like', "%{$this->type}%")
            ->orWhere('name', 'General Checkup')
            ->first();
        
        $amount = $service ? $service->price : 0;
        
        // Create invoice
        $invoice = Invoice::create([
            'clinic_id' => $this->clinic_id,
            'branch_id' => $this->branch_id,
            'patient_id' => $this->patient_id,
            'appointment_id' => $this->id,
            'invoice_number' => Invoice::generateNumber($this->clinic_id),
            'subtotal' => $amount,
            'tax_rate' => 15,
            'tax_amount' => $amount * 0.15,
            'total' => $amount * 1.15,
            'paid_amount' => 0,
            'balance_due' => $amount * 1.15,
            'status' => 'sent',
            'issued_at' => now(),
            'due_date' => now()->addDays(15),
            'created_by' => $this->created_by,
        ]);
        
        // Add invoice item
        if ($service && $amount > 0) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $this->type,
                'quantity' => 1,
                'unit_price' => $amount,
                'total' => $amount,
            ]);
        }
        
        return $invoice;
    }

    /**
     * Check if appointment can be checked in
     */
    public function canCheckIn(): bool
    {
        // Must be confirmed status
        if ($this->status !== self::STATUS_CONFIRMED) {
            return false;
        }
        
        // Patient must not be blocked
        if ($this->patient && $this->patient->is_blocked) {
            return false;
        }
        
        return true;
    }

    /**
     * Calculate late minutes if checking in now
     */
    public function calculateLateMinutes(): int
    {
        $now = now();
        $appointmentTime = $this->appointment_time;
        
        if ($now <= $appointmentTime) {
            return 0;
        }
        
        return (int) $appointmentTime->diffInMinutes($now);
    }

    /**
     * Get late category for queue positioning
     * Returns: 'on_time', 'moderate', 'severe'
     */
    public function getLateCategory(int $lateMinutes): string
    {
        if ($lateMinutes <= 0) {
            return 'on_time';
        }
        
        if ($lateMinutes <= 15) {
            return 'on_time';
        }
        
        if ($lateMinutes <= 30) {
            return 'moderate';
        }
        
        return 'severe';
    }

    /**
     * Get queue priority based on late status and appointment type
     */
    public function getQueuePriority(int $lateMinutes): string
    {
        $category = $this->getLateCategory($lateMinutes);
        
        if ($category === 'severe') {
            return QueueItem::PRIORITY_LATE_ARRIVAL;
        }
        
        return QueueItem::PRIORITY_SCHEDULED;
    }

    /**
     * Mark appointment as no-show
     */
    public function markAsNoShow(): void
    {
        $this->update([
            'status' => self::STATUS_NO_SHOW,
        ]);
        
        // Record no-show on patient
        if ($this->patient) {
            $this->patient->recordNoShow();
        }
    }

    /**
     * Start the appointment (begin clinical encounter)
     */
    public function start(): void
    {
        $this->update([
            'status' => self::STATUS_IN_PROGRESS,
            'start_time' => now(),
        ]);
        
        // Update queue item if exists
        if ($this->queueItem) {
            $this->queueItem->update([
                'status' => QueueItem::STATUS_IN_PROGRESS,
                'started_at' => now(),
            ]);
        }
    }

    /**
     * Complete the appointment
     */
    public function complete(): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'end_time' => now(),
        ]);
        
        // Update queue item if exists
        if ($this->queueItem) {
            $this->queueItem->update([
                'status' => QueueItem::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        }
    }

    /**
     * Transfer appointment to another dentist (referral or reassignment)
     */
    public function transferToDentist(int $newDentistId, string $reason, string $type = 'referral', ?int $createdBy = null): void
    {
        $oldDentistId = $this->dentist_id;
        
        $this->update([
            'dentist_id' => $newDentistId,
            'notes' => ($this->notes ? $this->notes . "\n" : '') . "[TRANSFER] {$type}: {$reason} | From dentist #{$oldDentistId} to #{$newDentistId}",
        ]);
        
        // Push to patient's medical cases
        if ($this->patient && $type === 'referral') {
            $this->patient->pushMedicalCase(
                "Referred from dentist #{$oldDentistId} to #{$newDentistId}: {$reason}",
                'referral'
            );
        }
        
        // Reset queue position if appointment is checked in
        if ($this->status === self::STATUS_CHECKED_IN && $this->queueItem) {
            $this->queueItem->update([
                'dentist_id' => $newDentistId,
            ]);
        }
    }

    // ── API format helper ───────────────────────────────────

    public function toApiArray(): array
    {
        return [
            'id'               => $this->id,
            'patient_id'       => $this->patient_id,
            'patient_name'     => $this->patient?->full_name ?? '—',
            'patient_phone'    => $this->patient?->phone ?? '—',
            'dentist_id'       => $this->dentist_id,
            'dentist_name'     => $this->dentist?->name ?? '—',
            'appointment_time' => $this->appointment_time->toDateTimeString(),
            'date'             => $this->appointment_time->toDateString(),
            'time'             => $this->appointment_time->format('H:i'),
            'ett_time'         => EthiopianTime::toEthiopian($this->appointment_time),
            'duration_minutes' => $this->duration_minutes,
            'type'             => $this->type,
            'status'           => $this->status,
            'notes'            => $this->notes,
            'queue_position'   => $this->queue_position,
            'reschedule_count' => $this->reschedule_count,
            'rescheduled_from' => $this->rescheduled_from?->toDateTimeString(),
            'created_by'       => $this->created_by,
            'created_by_name'  => $this->createdBy?->name ?? '—',
            'is_notified'      => $this->is_notified,
            'check_in_time'    => $this->check_in_time?->toDateTimeString(),
            'start_time'       => $this->start_time?->toDateTimeString(),
            'end_time'         => $this->end_time?->toDateTimeString(),
            'is_late'          => $this->is_late,
            'late_minutes'     => $this->late_minutes,
            'branch_id'        => $this->branch_id,
            'clinic_id'        => $this->clinic_id,
            // v2 billing fields
            'billing_model'    => $this->billing_model ?? self::BILLING_TREATMENT,
            'service_id'       => $this->service_id,
            'has_active_card'  => $this->patient?->hasActiveCard() ?? false,
            'requires_deposit' => $this->patient?->requiresDeposit() ?? false,
            'billing_summary'  => $this->getBillingSummary(),
            'created_at'       => $this->created_at?->toDateTimeString(),
            'updated_at'       => $this->updated_at?->toDateTimeString(),
        ];
    }

    // ── v2 Billing helpers ─────────────────────────────────

    public function getActiveTreatmentInvoice(): ?Invoice
    {
        return $this->treatmentInvoice ?? $this->invoice ?? null;
    }

    public function getBillingSummary(): array
    {
        $serviceInv   = $this->service_invoice_id
            ? Invoice::find($this->service_invoice_id) : null;
        $treatmentInv = $this->treatment_invoice_id
            ? Invoice::find($this->treatment_invoice_id)
            : ($this->invoice ?? null);

        $sTotal  = (float) ($serviceInv?->total   ?? 0);
        $tTotal  = (float) ($treatmentInv?->total  ?? 0);
        $sPaid   = (float) ($serviceInv?->paid     ?? 0);
        $tPaid   = (float) ($treatmentInv?->paid   ?? 0);
        $grand   = $sTotal + $tTotal;
        $paid    = $sPaid + $tPaid;

        return [
            'billing_model'       => $this->billing_model ?? self::BILLING_TREATMENT,
            'service_total'       => $sTotal,
            'treatment_total'     => $tTotal,
            'grand_total'         => $grand,
            'total_paid'          => $paid,
            'outstanding_balance' => $grand - $paid,
            'service_invoice'     => $serviceInv ? [
                'id'               => $serviceInv->id,
                'invoice_number'   => $serviceInv->invoice_number,
                'lifecycle_status' => $serviceInv->lifecycle_status ?? $serviceInv->status,
                'total'            => (float) $serviceInv->total,
                'balance'          => (float) $serviceInv->balance,
            ] : null,
            'treatment_invoice'   => $treatmentInv ? [
                'id'               => $treatmentInv->id,
                'invoice_number'   => $treatmentInv->invoice_number,
                'lifecycle_status' => $treatmentInv->lifecycle_status ?? $treatmentInv->status,
                'total'            => (float) $treatmentInv->total,
                'balance'          => (float) $treatmentInv->balance,
            ] : null,
        ];
    }
}
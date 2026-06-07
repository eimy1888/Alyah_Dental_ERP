<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BillingEvent — immutable audit log of every billing action.
 * Nothing is ever deleted from this table.
 * Used for the billing event timeline shown to accountants and dentists.
 */
class BillingEvent extends Model
{
    // No updated_at — immutable records
    const UPDATED_AT = null;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'invoice_id',
        'appointment_id',
        'treatment_episode_id',
        'patient_id',
        'triggered_by',
        'event_type',
        'amount_impact',
        'invoice_total_before',
        'invoice_total_after',
        'metadata',
    ];

    protected $casts = [
        'metadata'            => 'array',
        'amount_impact'       => 'decimal:2',
        'invoice_total_before'=> 'decimal:2',
        'invoice_total_after' => 'decimal:2',
    ];

    // ── Event type constants ──────────────────────────────────────────────────
    const EVENT_INVOICE_CREATED            = 'invoice_created';
    const EVENT_EPISODE_OPENED             = 'episode_opened';
    const EVENT_PROCEDURE_ADDED            = 'procedure_added';
    const EVENT_PROCEDURE_REMOVED          = 'procedure_removed';
    const EVENT_MATERIAL_CONSUMED          = 'material_consumed';
    const EVENT_LAB_ORDERED                = 'lab_ordered';
    const EVENT_PRICE_OVERRIDDEN           = 'price_overridden';
    const EVENT_DISCOUNT_APPLIED           = 'discount_applied';
    const EVENT_INSURANCE_APPLIED          = 'insurance_applied';
    const EVENT_PREPAYMENT_RECORDED        = 'prepayment_recorded';
    const EVENT_PAYMENT_RECORDED           = 'payment_recorded';
    const EVENT_SUBMITTED_FOR_REVIEW       = 'invoice_submitted_for_review';
    const EVENT_SENT_BACK                  = 'invoice_sent_back';
    const EVENT_INVOICE_FINALIZED          = 'invoice_finalized';
    const EVENT_INVOICE_LOCKED             = 'invoice_locked';
    const EVENT_INVOICE_CANCELLED          = 'invoice_cancelled';
    const EVENT_EPISODE_FINALIZED          = 'episode_finalized';
    const EVENT_EPISODE_CANCELLED          = 'episode_cancelled';

    // ── Relationships ─────────────────────────────────────────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function episode(): BelongsTo
    {
        return $this->belongsTo(TreatmentEpisode::class, 'treatment_episode_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    // ── Static factory ────────────────────────────────────────────────────────

    /**
     * Log a billing event.
     *
     * @param Invoice|null   $invoice
     * @param string         $eventType
     * @param float          $amountImpact   positive = added cost, negative = reduction
     * @param float          $totalAfter
     * @param array          $metadata
     * @param int            $triggeredBy    user id (0 = system)
     * @param int|null       $appointmentId
     * @param int|null       $episodeId
     */
    public static function log(
        ?Invoice $invoice,
        string   $eventType,
        float    $amountImpact,
        float    $totalAfter,
        array    $metadata    = [],
        int      $triggeredBy = 0,
        ?int     $appointmentId = null,
        ?int     $episodeId     = null
    ): self {
        return self::create([
            'clinic_id'             => $invoice?->clinic_id,
            'branch_id'             => $invoice?->branch_id,
            'invoice_id'            => $invoice?->id,
            'appointment_id'        => $appointmentId ?? $invoice?->appointment_id,
            'treatment_episode_id'  => $episodeId,
            'patient_id'            => $invoice?->patient_id,
            'triggered_by'          => $triggeredBy ?: null,
            'event_type'            => $eventType,
            'amount_impact'         => $amountImpact,
            'invoice_total_before'  => $totalAfter - $amountImpact,
            'invoice_total_after'   => $totalAfter,
            'metadata'              => $metadata,
        ]);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForInvoice($query, int $invoiceId)
    {
        return $query->where('invoice_id', $invoiceId);
    }

    public function scopeForAppointment($query, int $appointmentId)
    {
        return $query->where('appointment_id', $appointmentId);
    }

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }
}

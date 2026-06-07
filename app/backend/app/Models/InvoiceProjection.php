<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * InvoiceProjection — the Billing Projection Layer.
 *
 * This is the middle layer between a clinical action (Procedure/Material/Lab)
 * and the actual Invoice. Procedures NEVER write directly to invoices.
 *
 * Flow:
 *   Clinical action added
 *     → ProjectionLine created here (status: pending)
 *     → BillingCalculatorService reads lines + applies PricingRules
 *     → Computes final_unit_price (after modifiers, insurance, discounts)
 *     → InvoiceUpdateEngine writes to invoice_items (status: committed)
 *     → BillingEvent logged
 *
 * This decoupling allows:
 *   - Insurance recalculation without touching live invoice items
 *   - Discount rules applied transparently
 *   - Tax rule changes reflected without data loss
 *   - Price override audit trail
 *   - Re-projection when pricing rules change
 */
class InvoiceProjection extends Model
{
    use HasFactory;

    protected $table = 'invoice_projections';

    // ── Status constants ──────────────────────────────────────────────────────
    const STATUS_PENDING   = 'pending';    // awaiting BillingCalculator run
    const STATUS_COMMITTED = 'committed';  // written to invoice_items
    const STATUS_REVISED   = 'revised';    // repriced after initial commit
    const STATUS_REMOVED   = 'removed';    // deleted — reversal applied to invoice
    const STATUS_OVERRIDDEN= 'overridden'; // manual price override applied

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'treatment_episode_id',
        'invoice_id',
        'source_type',
        'source_id',
        'description',
        'quantity',
        'base_unit_price',
        'modifier_applied',
        'final_unit_price',
        'line_total',
        'applied_rules',
        'insurance_coverage',
        'patient_liability',
        'discount_amount',
        'discount_reason',
        'status',
        'added_by',
        'overridden_by',
        'committed_at',
        'invoice_item_id',
    ];

    protected $casts = [
        'quantity'           => 'decimal:2',
        'base_unit_price'    => 'decimal:2',
        'modifier_applied'   => 'decimal:2',
        'final_unit_price'   => 'decimal:2',
        'line_total'         => 'decimal:2',
        'insurance_coverage' => 'decimal:2',
        'patient_liability'  => 'decimal:2',
        'discount_amount'    => 'decimal:2',
        'applied_rules'      => 'array',
        'committed_at'       => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function episode(): BelongsTo
    {
        return $this->belongsTo(TreatmentEpisode::class, 'treatment_episode_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function invoiceItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceItem::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function overriddenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'overridden_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForEpisode($query, int $episodeId)
    {
        return $query->where('treatment_episode_id', $episodeId);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeCommitted($query)
    {
        return $query->where('status', self::STATUS_COMMITTED);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_COMMITTED]);
    }

    // ── Business Logic ────────────────────────────────────────────────────────

    /**
     * Apply a manual price override.
     * Sets status to overridden and logs the override.
     */
    public function applyOverride(float $newPrice, string $reason, User $by): void
    {
        $oldPrice = $this->final_unit_price;

        $this->update([
            'final_unit_price' => $newPrice,
            'line_total'       => $newPrice * $this->quantity,
            'patient_liability'=> ($newPrice * $this->quantity) - $this->insurance_coverage,
            'status'           => self::STATUS_OVERRIDDEN,
            'overridden_by'    => $by->id,
            'discount_reason'  => $reason,
        ]);

        // Log impact
        BillingEvent::log(
            $this->invoice,
            'price_overridden',
            ($newPrice - $oldPrice) * $this->quantity,
            $this->invoice?->total ?? 0,
            [
                'projection_id' => $this->id,
                'old_price'     => $oldPrice,
                'new_price'     => $newPrice,
                'reason'        => $reason,
            ],
            $by->id,
            $this->episode?->appointment_id
        );
    }

    /**
     * Apply insurance coverage to this line.
     * Recalculates patient_liability.
     */
    public function applyInsurance(float $coverageAmount, string $provider): void
    {
        $coverage = min($coverageAmount, $this->line_total);

        $this->update([
            'insurance_coverage' => $coverage,
            'patient_liability'  => max(0, $this->line_total - $coverage),
        ]);

        BillingEvent::log(
            $this->invoice,
            'insurance_applied',
            -$coverage,
            $this->invoice?->total ?? 0,
            [
                'projection_id' => $this->id,
                'provider'      => $provider,
                'coverage'      => $coverage,
            ],
            0, // system action
            $this->episode?->appointment_id
        );
    }
}

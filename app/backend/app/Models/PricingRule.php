<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * PricingRule — the Pricing Rule Engine data layer.
 *
 * Service.price is BASE only. Real pricing comes from applying
 * rules in priority order through BillingCalculatorService.
 *
 * Evaluation order (priority ASC, then rule_type weight):
 *   base → branch → doctor → insurance → urgency → promotion → override
 *
 * Each rule defines HOW it modifies the price:
 *   fixed        → replaces price entirely
 *   percentage   → base × (1 + value/100)
 *   flat_add     → base + value
 *   flat_subtract→ base - value
 */
class PricingRule extends Model
{
    use HasFactory, SoftDeletes;

    // ── Rule type constants (evaluation order) ────────────────────────────────
    const TYPE_BASE      = 'base';
    const TYPE_BRANCH    = 'branch';
    const TYPE_DOCTOR    = 'doctor';
    const TYPE_INSURANCE = 'insurance';
    const TYPE_URGENCY   = 'urgency';
    const TYPE_PROMOTION = 'promotion';
    const TYPE_OVERRIDE  = 'override';

    // Weight order for rule evaluation (lower = evaluated first)
    const TYPE_WEIGHT = [
        self::TYPE_BASE      => 1,
        self::TYPE_BRANCH    => 2,
        self::TYPE_DOCTOR    => 3,
        self::TYPE_INSURANCE => 4,
        self::TYPE_URGENCY   => 5,
        self::TYPE_PROMOTION => 6,
        self::TYPE_OVERRIDE  => 7,
    ];

    // ── Modifier type constants ───────────────────────────────────────────────
    const MOD_FIXED         = 'fixed';
    const MOD_PERCENTAGE    = 'percentage';
    const MOD_FLAT_ADD      = 'flat_add';
    const MOD_FLAT_SUBTRACT = 'flat_subtract';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'service_id',
        'dentist_id',
        'rule_type',
        'modifier_type',
        'value',
        'min_price',
        'max_price',
        'insurance_provider',
        'coverage_percentage',
        'valid_from',
        'valid_until',
        'priority',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'value'               => 'decimal:2',
        'min_price'           => 'decimal:2',
        'max_price'           => 'decimal:2',
        'coverage_percentage' => 'decimal:2',
        'priority'            => 'integer',
        'is_active'           => 'boolean',
        'valid_from'          => 'date',
        'valid_until'         => 'date',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function dentist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('valid_from')
                  ->orWhere('valid_from', '<=', now()->toDateString());
            })
            ->where(function ($q) {
                $q->whereNull('valid_until')
                  ->orWhere('valid_until', '>=', now()->toDateString());
            });
    }

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForService($query, int $serviceId)
    {
        return $query->where(function ($q) use ($serviceId) {
            $q->where('service_id', $serviceId)
              ->orWhereNull('service_id'); // null = applies to all services
        });
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        return $query->where(function ($q) use ($branchId) {
            $q->whereNull('branch_id')
              ->orWhere('branch_id', $branchId);
        });
    }

    public function scopeForDentist($query, ?int $dentistId)
    {
        return $query->where(function ($q) use ($dentistId) {
            $q->whereNull('dentist_id')
              ->orWhere('dentist_id', $dentistId);
        });
    }

    // ── Core Price Computation ────────────────────────────────────────────────

    /**
     * Apply this rule to a given base price.
     * Returns the modified price (clamped to min/max if set).
     */
    public function applyTo(float $price): float
    {
        $modified = match ($this->modifier_type) {
            self::MOD_FIXED         => (float) $this->value,
            self::MOD_PERCENTAGE    => $price * (1 + ((float) $this->value / 100)),
            self::MOD_FLAT_ADD      => $price + (float) $this->value,
            self::MOD_FLAT_SUBTRACT => $price - (float) $this->value,
            default                 => $price,
        };

        // Clamp to min/max
        if ($this->min_price !== null) {
            $modified = max($modified, (float) $this->min_price);
        }
        if ($this->max_price !== null) {
            $modified = min($modified, (float) $this->max_price);
        }

        return max(0, round($modified, 2));
    }

    /**
     * Compute insurance coverage amount for a given price.
     * Only applies to insurance-type rules.
     */
    public function computeCoverage(float $lineTotal): float
    {
        if ($this->rule_type !== self::TYPE_INSURANCE || !$this->coverage_percentage) {
            return 0;
        }

        return round($lineTotal * ((float) $this->coverage_percentage / 100), 2);
    }

    /**
     * Get the human-readable type weight for sorting.
     */
    public function getTypeWeight(): int
    {
        return self::TYPE_WEIGHT[$this->rule_type] ?? 99;
    }
}

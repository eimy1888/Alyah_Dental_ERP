<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * TreatmentEpisode — the central unit of clinical + billing work.
 *
 * One appointment can have multiple episodes:
 *   - Multiple dentists treating same patient
 *   - Staged treatments (implant phase 1, 2, 3)
 *   - Lab delays that hold one episode open while others proceed
 *   - Insurance approval per procedure group
 *
 * Procedures, lab orders, and material consumption all belong
 * to an episode, NOT directly to an appointment.
 *
 * Each episode links to exactly ONE invoice.
 * BillingCalculatorService computes invoice amounts through
 * InvoiceProjection lines — never writing directly to Invoice.
 */
class TreatmentEpisode extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'treatment_episodes';

    // ── Status constants ──────────────────────────────────────────────────────
    const STATUS_OPEN           = 'open';
    const STATUS_PENDING_LAB    = 'pending_lab';
    const STATUS_PENDING_REVIEW = 'pending_review';
    const STATUS_FINALIZED      = 'finalized';
    const STATUS_BILLED         = 'billed';
    const STATUS_CANCELLED      = 'cancelled';

    // ── Episode type constants ────────────────────────────────────────────────
    const TYPE_SERVICE   = 'service';
    const TYPE_TREATMENT = 'treatment';
    const TYPE_HYBRID    = 'hybrid';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'appointment_id',
        'patient_id',
        'dentist_id',
        'title',
        'diagnosis',
        'treatment_plan',
        'status',
        'episode_type',
        'invoice_id',
        'parent_episode_id',
        'phase_number',
        'finalized_total',
        'opened_at',
        'finalized_at',
        'finalized_by',
    ];

    protected $casts = [
        'opened_at'      => 'datetime',
        'finalized_at'   => 'datetime',
        'finalized_total'=> 'decimal:2',
        'phase_number'   => 'integer',
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

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function dentist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function parentEpisode(): BelongsTo
    {
        return $this->belongsTo(TreatmentEpisode::class, 'parent_episode_id');
    }

    public function childEpisodes(): HasMany
    {
        return $this->hasMany(TreatmentEpisode::class, 'parent_episode_id');
    }

    public function procedures(): HasMany
    {
        return $this->hasMany(Procedure::class)->orderBy('sequence');
    }

    public function projections(): HasMany
    {
        return $this->hasMany(InvoiceProjection::class);
    }

    public function billingEvents(): HasMany
    {
        return $this->hasMany(BillingEvent::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeOpen($query)
    {
        return $query->where('status', self::STATUS_OPEN);
    }

    public function scopeForAppointment($query, int $appointmentId)
    {
        return $query->where('appointment_id', $appointmentId);
    }

    // ── Business Logic ────────────────────────────────────────────────────────

    public function isEditable(): bool
    {
        return in_array($this->status, [
            self::STATUS_OPEN,
            self::STATUS_PENDING_LAB,
        ]);
    }

    public function isFinalized(): bool
    {
        return in_array($this->status, [
            self::STATUS_FINALIZED,
            self::STATUS_BILLED,
        ]);
    }

    /**
     * Finalize this episode — dentist signs off.
     * Transitions status to pending_review so accountant can verify.
     */
    public function finalize(User $by): void
    {
        if (!$this->isEditable()) {
            return;
        }

        $projectedTotal = $this->projections()
            ->whereIn('status', ['committed', 'pending'])
            ->sum('line_total');

        $this->update([
            'status'          => self::STATUS_FINALIZED,
            'finalized_at'    => now(),
            'finalized_by'    => $by->id,
            'finalized_total' => $projectedTotal,
        ]);

        // Push invoice into under_review
        if ($this->invoice) {
            $this->invoice->submitForReview($by);
        }

        BillingEvent::log(
            $this->invoice,
            'episode_finalized',
            0,
            $this->invoice?->total ?? 0,
            ['episode_id' => $this->id, 'phase' => $this->phase_number],
            $by->id,
            $this->appointment_id
        );
    }

    /**
     * Mark episode as waiting for lab results.
     * Keeps invoice in in_progress — does not block other episodes.
     */
    public function waitForLab(string $labNotes = ''): void
    {
        $this->update(['status' => self::STATUS_PENDING_LAB]);
    }

    /**
     * Resume from lab wait.
     */
    public function resumeFromLab(): void
    {
        if ($this->status === self::STATUS_PENDING_LAB) {
            $this->update(['status' => self::STATUS_OPEN]);
        }
    }

    /**
     * Get episode timeline for dentist UI.
     */
    public function getTimeline(): array
    {
        return [
            'episode_id'      => $this->id,
            'title'           => $this->title ?? "Episode {$this->phase_number}",
            'status'          => $this->status,
            'episode_type'    => $this->episode_type,
            'phase_number'    => $this->phase_number,
            'diagnosis'       => $this->diagnosis,
            'treatment_plan'  => $this->treatment_plan,
            'opened_at'       => $this->opened_at->format('Y-m-d H:i'),
            'finalized_at'    => $this->finalized_at?->format('Y-m-d H:i'),
            'dentist'         => $this->dentist?->name,
            'procedures'      => $this->procedures->map(fn($p) => [
                'id'           => $p->id,
                'name'         => $p->name,
                'tooth_number' => $p->tooth_number,
                'sequence'     => $p->sequence,
                'status'       => $p->status,
            ]),
            'cost_evolution'  => $this->projections()
                ->orderBy('created_at')
                ->get()
                ->map(fn($pr) => [
                    'description'       => $pr->description,
                    'base_price'        => $pr->base_unit_price,
                    'final_price'       => $pr->final_unit_price,
                    'line_total'        => $pr->line_total,
                    'insurance_coverage'=> $pr->insurance_coverage,
                    'patient_liability' => $pr->patient_liability,
                    'status'            => $pr->status,
                ]),
            'projected_total' => $this->projections()
                ->whereIn('status', ['committed', 'pending'])
                ->sum('line_total'),
            'invoice'         => $this->invoice ? [
                'id'               => $this->invoice->id,
                'invoice_number'   => $this->invoice->invoice_number,
                'lifecycle_status' => $this->invoice->lifecycle_status,
                'total'            => $this->invoice->total,
                'balance'          => $this->invoice->balance,
            ] : null,
        ];
    }
}

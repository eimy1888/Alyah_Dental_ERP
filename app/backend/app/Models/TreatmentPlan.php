<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TreatmentPlan extends Model
{
    use HasFactory, SoftDeletes;

    // ── Status constants ──────────────────────────────────────────────────────
    const STATUS_DRAFT       = 'draft';
    const STATUS_ACTIVE      = 'active';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_PENDING_LAB = 'pending_lab';
    const STATUS_COMPLETED   = 'completed';
    const STATUS_CANCELLED   = 'cancelled';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'gp_id',
        'initial_appointment_id',
        'title',
        'diagnosis',
        'status',
        'requires_lab',
        'requires_specialist',
        'specialist_type',
        'total_sessions_planned',
        'total_sessions_done',
        'deposit_required_pct',
        'deposit_paid',
        'estimate_invoice_id',
        'final_invoice_id',
        'notes',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'requires_lab'         => 'boolean',
        'requires_specialist'  => 'boolean',
        'deposit_paid'         => 'boolean',
        'deposit_required_pct' => 'decimal:2',
        'started_at'           => 'datetime',
        'completed_at'         => 'datetime',
        'total_sessions_planned' => 'integer',
        'total_sessions_done'    => 'integer',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

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

    public function gp()
    {
        return $this->belongsTo(User::class, 'gp_id');
    }

    public function initialAppointment()
    {
        return $this->belongsTo(Appointment::class, 'initial_appointment_id');
    }

    public function estimateInvoice()
    {
        return $this->belongsTo(Invoice::class, 'estimate_invoice_id');
    }

    public function finalInvoice()
    {
        return $this->belongsTo(Invoice::class, 'final_invoice_id');
    }

    public function labOrders()
    {
        return $this->hasMany(LabOrder::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

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

    // ── Helper methods ─────────────────────────────────────────────────────────

    public function isEditable(): bool
    {
        return !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Recall extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'appointment_id',
        'dentist_id',
        'recall_interval_months',
        'due_date',
        'notification_sent_at',
        'notification_sent',
        'status',
        'notes',
    ];

    protected $casts = [
        'due_date'              => 'date',
        'notification_sent_at'  => 'datetime',
        'notification_sent'     => 'boolean',
        'recall_interval_months'=> 'integer',
    ];

    // ── Status constants ───────────────────────────────────
    const STATUS_PENDING   = 'pending';
    const STATUS_NOTIFIED  = 'notified';
    const STATUS_BOOKED    = 'booked';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    // ── Relationships ──────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function dentist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    // ── Scopes ─────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeDueSoon($query, int $days = 7)
    {
        return $query->where('status', self::STATUS_PENDING)
                     ->whereDate('due_date', '<=', now()->addDays($days))
                     ->whereDate('due_date', '>=', now());
    }
}
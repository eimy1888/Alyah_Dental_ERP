<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class QueueItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'appointment_id',
        'patient_id',
        'dentist_id',
        'priority',
        'position',
        'status',
        'notes',
        'called_at',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'called_at'    => 'datetime',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
        'position'     => 'integer',
    ];

    // ── Priority constants ─────────────────────────────────
    const PRIORITY_EMERGENCY    = 'emergency';
    const PRIORITY_SCHEDULED    = 'scheduled';
    const PRIORITY_WALK_IN      = 'walk_in';
    const PRIORITY_LATE_ARRIVAL = 'late_arrival';

    // ── Status constants ───────────────────────────────────
    const STATUS_WAITING      = 'waiting';
    const STATUS_IN_PROGRESS  = 'in_progress';
    const STATUS_COMPLETED    = 'completed';
    const STATUS_REMOVED      = 'removed';

    // ── Priority order (lower number = higher priority) ────
    public static function priorityOrder(string $priority): int
    {
        return match ($priority) {
            self::PRIORITY_EMERGENCY    => 1,
            self::PRIORITY_SCHEDULED    => 2,
            self::PRIORITY_WALK_IN      => 3,
            self::PRIORITY_LATE_ARRIVAL => 4,
            default                     => 99,
        };
    }

    // ── Relationships ──────────────────────────────────────

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

    // ── Scopes ─────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeWaiting($query)
    {
        return $query->where('status', self::STATUS_WAITING);
    }

    public function scopeForDentist($query, int $dentistId)
    {
        return $query->where('dentist_id', $dentistId);
    }

    public function scopeOrdered($query)
    {
        return $query->orderByRaw('
            CASE priority
                WHEN \'emergency\' THEN 1
                WHEN \'scheduled\' THEN 2
                WHEN \'walk_in\' THEN 3
                WHEN \'late_arrival\' THEN 4
                ELSE 99
            END
        ')->orderBy('position');
    }
}
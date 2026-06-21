<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\QueryException;

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
        'active_queue_key',
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

    protected static function booted(): void
    {
        static::saving(function (QueueItem $item) {
            $item->active_queue_key = $item->isActiveQueueItem() && $item->appointment_id
                ? (string) $item->appointment_id
                : null;
        });
    }

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

    public static function activeStatuses(): array
    {
        return [self::STATUS_WAITING, self::STATUS_IN_PROGRESS];
    }

    public function isActiveQueueItem(): bool
    {
        return in_array($this->status, self::activeStatuses(), true);
    }

    public static function enqueueAppointment(Appointment $appointment, string $priority, ?string $notes = null): self
    {
        $existing = static::activeForAppointment($appointment->id)->first();
        if ($existing) {
            return $existing;
        }

        $position = ((int) static::where('clinic_id', $appointment->clinic_id)
            ->where('branch_id', $appointment->branch_id)
            ->where('dentist_id', $appointment->dentist_id)
            ->where('status', self::STATUS_WAITING)
            ->max('position')) + 1;

        try {
            $queueItem = static::create([
                'clinic_id' => $appointment->clinic_id,
                'branch_id' => $appointment->branch_id,
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'dentist_id' => $appointment->dentist_id,
                'priority' => $priority,
                'position' => $position,
                'status' => self::STATUS_WAITING,
                'notes' => $notes,
            ]);
        } catch (QueryException $e) {
            $queueItem = static::activeForAppointment($appointment->id)->first();
            if (!$queueItem) {
                throw $e;
            }
        }

        static::recalculatePositions($appointment->clinic_id, $appointment->branch_id, $appointment->dentist_id);

        return $queueItem->fresh() ?? $queueItem;
    }

    public static function recalculatePositions(int $clinicId, ?int $branchId = null, ?int $dentistId = null): void
    {
        $query = static::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('status', self::STATUS_WAITING);

        if ($dentistId !== null) {
            $query->forDentist($dentistId);
        }

        $position = 1;
        foreach ($query->ordered()->get() as $item) {
            if ((int) $item->position !== $position) {
                $item->position = $position;
                $item->saveQuietly();
            }
            $position++;
        }
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

    public function scopeForBranch($query, ?int $branchId)
    {
        if ($branchId === null) {
            return $query;
        }
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

    public function scopeActiveForAppointment($query, int $appointmentId)
    {
        return $query->where('appointment_id', $appointmentId)
            ->whereIn('status', self::activeStatuses());
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

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class LabOrder extends Model
{
    use HasFactory, SoftDeletes;

    // ── Status constants ──────────────────────────────────────────────────────
    const STATUS_PENDING    = 'pending';
    const STATUS_CREATED    = 'pending';
    const STATUS_ACCEPTED   = 'sent_to_lab';
    const STATUS_SENT_TO_LAB = 'sent_to_lab';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_READY      = 'ready';
    const STATUS_COMPLETED  = 'ready';
    const STATUS_DELIVERED  = 'delivered';
    const STATUS_CANCELLED  = 'cancelled';

    // ── Order type constants ───────────────────────────────────────────────────
    const TYPE_CROWN         = 'crown';
    const TYPE_BRIDGE        = 'bridge';
    const TYPE_DENTURE       = 'denture';
    const TYPE_ALIGNER       = 'aligner';
    const TYPE_VENEER        = 'veneer';
    const TYPE_IMPLANT_CROWN = 'implant_crown';
    const TYPE_DIAGNOSTIC    = 'diagnostic';
    const TYPE_OTHER         = 'other';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'treatment_plan_id',
        'appointment_id',
        'ordering_dentist_id',
        'fitting_specialist_id',
        'lab_order_number',
        'order_type',
        'material',
        'tooth_numbers',
        'instructions',
        'attachments',
        'status',
        'expected_ready_date',
        'actual_ready_date',
        'fitting_appointment_id',
        'notes',
        'lab_notes',
        'delivered_at',
        'dentist_acknowledged_at',
    ];

    protected $casts = [
        'tooth_numbers'       => 'array',
        'attachments'         => 'array',
        'expected_ready_date' => 'date',
        'actual_ready_date'   => 'date',
        'delivered_at'        => 'datetime',
        'dentist_acknowledged_at' => 'datetime',
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

    public function orderingDentist()
    {
        return $this->belongsTo(User::class, 'ordering_dentist_id');
    }

    public function fittingSpecialist()
    {
        return $this->belongsTo(User::class, 'fitting_specialist_id');
    }

    public function treatmentPlan()
    {
        return $this->belongsTo(TreatmentPlan::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function fittingAppointment()
    {
        return $this->belongsTo(Appointment::class, 'fitting_appointment_id');
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

    // ── Static methods ─────────────────────────────────────────────────────────

    /**
     * Generate a unique lab order number: LAB-{YEAR}-{padded_seq}
     */
    public static function generateNumber(int $clinicId): string
    {
        $year = Carbon::now()->year;
        $prefix = "LAB-{$year}-";

        $last = static::where('clinic_id', $clinicId)
            ->where('lab_order_number', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->first();

        if ($last) {
            $seq = (int) substr($last->lab_order_number, strlen($prefix));
            $seq++;
        } else {
            $seq = 1;
        }

        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    // ── Helper methods ─────────────────────────────────────────────────────────

    public function markReady(): void
    {
        $this->update([
            'status'            => self::STATUS_READY,
            'actual_ready_date' => Carbon::now()->toDateString(),
        ]);
    }

    public function markDelivered(): void
    {
        $this->update([
            'status' => self::STATUS_DELIVERED,
            'delivered_at' => now(),
        ]);
    }

    public function acknowledgeByDentist(): void
    {
        $this->update(['dentist_acknowledged_at' => now()]);
    }
}

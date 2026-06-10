<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Prescription extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'dentist_id',
        'appointment_id',
        'medication',
        'dosage',
        'duration_days',
        'instructions',
        'issued_at',
        'is_refillable',
        'refills_remaining',
    ];

    protected $casts = [
        'issued_at'         => 'date',
        'is_refillable'     => 'boolean',
        'duration_days'     => 'integer',
        'refills_remaining' => 'integer',
    ];

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

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
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

    public function scopeForPatient($query, int $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeIssuedBetween($query, string $from, string $to)
    {
        return $query->whereBetween('issued_at', [$from, $to]);
    }

    // ── Computed attributes ────────────────────────────────

    public function getExpiryDateAttribute()
    {
        return $this->issued_at->addDays($this->duration_days);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date->isPast();
    }

    // ── Medical Records transformation ────────────────────
    // Used by MedicalRecordController to build unified timeline

    public function toMedicalRecord(): array
    {
        return [
            'id'           => $this->id,
            'type'         => 'prescription',
            'patient_id'   => $this->patient_id,
            'patient_name' => $this->patient?->full_name ?? '—',
            'date'         => $this->issued_at->toDateString(),
            'description'  => "Prescription: {$this->medication}",
            'details'      => [
                'medication'    => $this->medication,
                'dosage'        => $this->dosage,
                'duration_days' => $this->duration_days,
                'instructions'  => $this->instructions,
                'is_refillable' => $this->is_refillable,
            ],
        ];
    }
}
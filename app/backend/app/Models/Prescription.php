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
        'date',
        'notes',
        'status',
        'finalized_at',
        'medication',
        'dosage',
        'duration_days',
        'instructions',
        'issued_at',
        'is_refillable',
        'refills_remaining',
    ];

    protected $casts = [
        'date'              => 'date',
        'finalized_at'      => 'datetime',
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

    public function items()
    {
        return $this->hasMany(PrescriptionItem::class);
    }

    public function isDraft(): bool
    {
        return ($this->status ?? 'draft') === 'draft';
    }

    public function finalize(): void
    {
        if (!$this->isDraft()) {
            return;
        }

        $this->update([
            'status' => 'finalized',
            'finalized_at' => now(),
            'issued_at' => $this->issued_at ?? now()->toDateString(),
            'date' => $this->date ?? now()->toDateString(),
        ]);
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
            'date'         => ($this->date ?? $this->issued_at ?? $this->created_at)->toDateString(),
            'description'  => "Prescription: " . ($this->items->first()?->drug_name ?? $this->medication),
            'details'      => [
                'status'        => $this->status ?? 'finalized',
                'notes'         => $this->notes,
                'medication'    => $this->medication,
                'dosage'        => $this->dosage,
                'duration_days' => $this->duration_days,
                'instructions'  => $this->instructions,
                'items'         => $this->items->map(fn($item) => [
                    'drug_name' => $item->drug_name,
                    'dosage' => $item->dosage,
                    'frequency' => $item->frequency,
                    'duration' => $item->duration,
                    'instructions' => $item->instructions,
                ])->values(),
                'is_refillable' => $this->is_refillable,
            ],
        ];
    }
}

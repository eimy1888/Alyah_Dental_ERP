<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class XRay extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'x_rays';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'dentist_id',
        'appointment_id',
        'study_type',
        'tooth_number',
        'region',
        'file_path',
        'file_name',
        'file_size',
        'status',
        'findings',
        'captured_at',
    ];

    protected $casts = [
        'captured_at' => 'date',
    ];

    // Status constants
    const STATUS_PENDING_UPLOAD = 'pending_upload';
    const STATUS_READY_FOR_REVIEW = 'ready_for_review';
    const STATUS_ANNOTATED = 'annotated';

    // Relationships
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

    // Scopes
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

    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    // Computed attributes
    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? "/storage/{$this->file_path}"
            : null;
    }

    public function getIsAnnotatedAttribute(): bool
    {
        return $this->status === self::STATUS_ANNOTATED;
    }

    // Medical Records transformation
    public function toMedicalRecord(): array
    {
        return [
            'id'           => $this->id,
            'type'         => 'xray',
            'patient_id'   => $this->patient_id,
            'patient_name' => $this->patient?->full_name ?? '—',
            'date'         => $this->captured_at->toDateString(),
            'description'  => "X-Ray: {$this->study_type}",
            'details'      => [
                'study_type'  => $this->study_type,
                'tooth_number'=> $this->tooth_number,
                'region'      => $this->region,
                'status'      => $this->status,
                'findings'    => $this->findings,
                'file_url'    => $this->file_url,
            ],
        ];
    }
}
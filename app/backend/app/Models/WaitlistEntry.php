<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Helpers\EthiopianTime;
//use Illuminate\Database\Eloquent\SoftDeletes;

class WaitlistEntry extends Model
{
   // use SoftDeletes;

    protected $table = 'waitlist_entries';

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'name',
        'phone',
        'medical_cases',
        'priority',
        'status',
        'arrived_at',
        'created_by',
    ];

    protected $casts = [
        'medical_cases' => 'array',
        'arrived_at'    => 'datetime',
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

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

    public function scopeToday($query)
    {
        return $query->whereDate('arrived_at', today())
                     ->orWhereDate('created_at', today());
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getLastMedicalCaseAttribute(): ?string
    {
        $cases = $this->medical_cases ?? [];
        if (empty($cases)) return null;
        $last = end($cases);
        return $last['case'] ?? null;
    }

    // ── API format helper ─────────────────────────────────────────────────────

    public function toApiArray(): array
    {
        $cases    = $this->medical_cases ?? [];
        $lastCase = !empty($cases) ? end($cases)['case'] : null;

        return [
            'id'                   => $this->id,
            'patient_id'           => $this->patient_id,
            'name'                 => $this->name,
            'phone'                => $this->phone,
            'priority'             => $this->priority,
            'status'               => $this->status,
            'medical_cases'        => $cases,
            'last_medical_case'    => $lastCase,
            'current_medical_case' => $lastCase,
            'arrived_at'           => $this->arrived_at?->toDateTimeString(),
            'arrived_time'         => $this->arrived_at
                ? $this->arrived_at->format('H:i')
                : $this->created_at->format('H:i'),
            'ett_arrived_time'     => $this->arrived_at
                ? EthiopianTime::toEthiopian($this->arrived_at)
                : EthiopianTime::toEthiopian($this->created_at),
            // Pull gender/age directly from linked patient record
            'gender'               => $this->patient?->gender,
            'age'                  => $this->patient?->age,
            'date_of_birth'        => $this->patient?->date_of_birth?->toDateString(),
        ];
    }
}
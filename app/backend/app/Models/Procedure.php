<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Procedure extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'appointment_id',
        'treatment_episode_id',
        'patient_id',
        'dentist_id',
        'service_id',
        'invoice_item_id',
        'name',
        'description',
        'duration_minutes',
        'price',
        'tooth_number',
        'tooth_surface',
        'procedure_code',
        'notes',
        'materials_used',
        'status',
        'sequence',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration_minutes' => 'integer',
        'materials_used' => 'array',
        'status' => 'string',
    ];

    // ── Relationships ─────────────────────────────────────────────

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

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function invoiceItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceItem::class);
    }

    public function episode(): BelongsTo
    {
        return $this->belongsTo(TreatmentEpisode::class, 'treatment_episode_id');
    }

    // ── Helpers ─────────────────────────────────────────────────

    public function getFormattedPriceAttribute(): string
    {
        return 'ETB ' . number_format($this->price, 2);
    }

    public function getDisplayNameAttribute(): string
    {
        if ($this->tooth_number) {
            return "{$this->name} (Tooth #{$this->tooth_number})";
        }
        return $this->name;
    }

    // ── Scopes ──────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        if ($branchId) {
            return $query->where('branch_id', $branchId);
        }
        return $query;
    }

    public function scopeForAppointment($query, int $appointmentId)
    {
        return $query->where('appointment_id', $appointmentId);
    }

    public function scopePerformed($query)
    {
        return $query->where('status', 'performed');
    }
}
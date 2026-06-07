<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * AppointmentType — controlled vocabulary for appointment types.
 * clinic_id = null means it's a system default available to all clinics.
 */
class AppointmentType extends Model
{
    protected $fillable = [
        'clinic_id',
        'name',
        'short_code',
        'category',
        'default_duration_minutes',
        'billing_model',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'                => 'boolean',
        'default_duration_minutes' => 'integer',
        'sort_order'               => 'integer',
    ];

    const CATEGORY_GENERAL     = 'general';
    const CATEGORY_PREVENTIVE  = 'preventive';
    const CATEGORY_RESTORATIVE = 'restorative';
    const CATEGORY_COSMETIC    = 'cosmetic';
    const CATEGORY_SURGICAL    = 'surgical';
    const CATEGORY_EMERGENCY   = 'emergency';

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * Get all types visible to a clinic:
     *   - system defaults (clinic_id IS NULL)
     *   - plus this clinic's custom types
     */
    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')
              ->orWhere('clinic_id', $clinicId);
        });
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * Find by name (case-insensitive) for a clinic.
     * Used when mapping free-text type strings to catalogue entries.
     */
    public static function findByName(string $name, int $clinicId): ?self
    {
        return static::forClinic($clinicId)
            ->active()
            ->where('name', 'like', $name)
            ->orWhere('short_code', strtoupper($name))
            ->first();
    }
}

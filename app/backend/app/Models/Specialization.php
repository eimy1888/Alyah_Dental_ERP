<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Specialization extends Model
{
    protected $fillable = [
        'clinic_id',
        'name',
        'short_code',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * All specializations visible to a clinic:
     * system defaults (clinic_id IS NULL) + clinic's own customs.
     */
    public function scopeForClinic($query, ?int $clinicId)
    {
        return $query->where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id');
            if ($clinicId) {
                $q->orWhere('clinic_id', $clinicId);
            }
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
}

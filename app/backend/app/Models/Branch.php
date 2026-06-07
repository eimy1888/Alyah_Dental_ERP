<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'location',
        'phone',
        'email',
        'manager_name',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function staff(): HasMany
{
    return $this->hasMany(Staff::class);
}

    public function dentists(): HasMany
    {
        return $this->hasMany(User::class)
                    ->where('role', 'dentist');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function inventoryTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function manager(): BelongsTo
{
    return $this->belongsTo(User::class, 'manager_id');
}

    public function getTodayAppointmentsCount(): int
    {
        return $this->appointments()
                    ->whereDate('appointment_time', today())
                    ->count();
    }

    public function getLowStockCount(): int
    {
        return $this->inventoryItems()
                    ->whereColumn('current_quantity', '<=', 'reorder_threshold')
                    ->count();
    }
}
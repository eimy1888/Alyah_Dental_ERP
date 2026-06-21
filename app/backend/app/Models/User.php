<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'name',
        'email',
        'phone',
        'password',
        'role',
        'is_active',
        'must_change_password',
        'notification_preferences',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'is_active'         => 'boolean',
        'must_change_password' => 'boolean',
        'notification_preferences' => 'array',
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

    /** Appointments where this user is the dentist */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'dentist_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'dentist_id');
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class, 'dentist_id');
    }

    public function patients(): HasManyThrough
    {
        return $this->hasManyThrough(
            Patient::class,
            Appointment::class,
            'dentist_id',
            'id',
            'id',
            'patient_id'
        );
    }

    public function patient()
{
    return $this->hasOne(Patient::class, 'user_id');
}
    

    /**
     * Override the default password reset notification with DentFlow branding.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    // ── Role helpers ──────────────────────────────────────────────────────────

    public function isPlatformAdmin(): bool
    {
        return $this->role === 'platform_admin';
    }

    public function isClinicAdmin(): bool
    {
        return $this->role === 'clinic_admin';
    }

    public function isBranchManager(): bool
    {
        return $this->role === 'branch_manager';
    }

    public function isDentist(): bool
    {
        return $this->role === 'dentist';
    }

    public function isReceptionist(): bool
    {
        return $this->role === 'receptionist';
    }

    public function isAccountant(): bool
    {
        return $this->role === 'accountant';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient'; // ← bug fix: was $role (undefined variable)
    }

    // ── Branch scoping helper ─────────────────────────────────────────────────

    public function getBranchScope(): ?int
    {
        if (in_array($this->role, ['branch_manager', 'dentist', 'receptionist', 'accountant', 'patient'])) {
            return $this->branch_id;
        }
        return null;
    }
}

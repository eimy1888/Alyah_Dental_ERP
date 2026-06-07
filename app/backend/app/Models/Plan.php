<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'monthly_price',
        'annual_price',
        'max_users',
        'max_branches',
        'max_storage_gb',
        'features',
        'is_active',
    ];

    protected $casts = [
        'monthly_price'  => 'decimal:2',
        'annual_price'   => 'decimal:2',
        'max_users'      => 'integer',
        'max_branches'   => 'integer',
        'max_storage_gb' => 'integer',
        'features'       => 'array',
        'is_active'      => 'boolean',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }

 public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(\App\Models\Subscription::class);
}

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
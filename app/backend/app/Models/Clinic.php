<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Clinic extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'subdomain',
        'subdomain_active',
        'slug',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'status',
        'plan_id',
        'approved_at',
        'subscription_ends_at',
        'settings',
    ];

    protected $casts = [
        'settings'             => 'array',
        'approved_at'          => 'datetime',
        'subscription_ends_at' => 'datetime',
        'subdomain_active'     => 'boolean',
    ];

    // ─── Default Settings ─────────────────────────────────────────────────────
    
    const DEFAULT_SETTINGS = [
        'no_show_threshold_minutes' => 10,
        'emergency_wait_threshold_minutes' => 30,
        'default_service_id' => null,
        'default_dentist_id' => null,
        'morning_session_start' => '08:30',
        'morning_session_end' => '12:00',
        'afternoon_session_start' => '13:30',
        'afternoon_session_end' => '17:00',
        'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        'invoice_prefix' => 'INV',
        'receipt_footer_text' => null,
        'card_price' => 100,
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function admin(): HasOne
    {
        return $this->hasOne(User::class)->where('role', 'clinic_admin');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->where('status', 'active')
            ->latestOfMany();
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    // ─── Settings Helpers ─────────────────────────────────────────────────────
    
    /**
     * Get a setting value by key, with default fallback
     */
    public function getSetting(string $key, $default = null)
    {
        $settings = $this->settings ?? [];
        
        if (array_key_exists($key, $settings)) {
            return $settings[$key];
        }
        
        if (array_key_exists($key, self::DEFAULT_SETTINGS)) {
            return self::DEFAULT_SETTINGS[$key];
        }
        
        return $default;
    }
    
    /**
     * Set a setting value
     */
    public function setSetting(string $key, $value): void
    {
        $settings = $this->settings ?? [];
        $settings[$key] = $value;
        $this->update(['settings' => $settings]);
    }
    
    /**
     * Get multiple settings at once
     */
    public function getSettings(array $keys): array
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $this->getSetting($key);
        }
        return $result;
    }
    
    /**
     * Get no-show threshold in minutes (default 10)
     */
    public function getNoShowThreshold(): int
    {
        return (int) $this->getSetting('no_show_threshold_minutes', 10);
    }
    
    /**
     * Get emergency wait threshold in minutes (default 30)
     */
    public function getEmergencyWaitThreshold(): int
    {
        return (int) $this->getSetting('emergency_wait_threshold_minutes', 30);
    }
    
    /**
     * Get default service ID for "General Checkup"
     */
    public function getDefaultServiceId(): ?int
    {
        return $this->getSetting('default_service_id');
    }
    
    /**
     * Get default dentist ID for unknown service assignments
     */
    public function getDefaultDentistId(): ?int
    {
        return $this->getSetting('default_dentist_id');
    }

    /**
     * Get clinic card price in ETB (default 100)
     */
    public function getCardPrice(): float
    {
        return (float) $this->getSetting('card_price', 100);
    }

    /**
     * Set clinic card price in ETB
     */
    public function setCardPrice(float $price): void
    {
        $this->setSetting('card_price', $price);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return in_array($this->status, ['pending_payment', 'pending_platform_approval']);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Generate a unique subdomain slug from the clinic name.
     */
    public static function generateSubdomain(string $name): string
    {
        $base = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        $base = trim($base, '-');
        $slug = $base;
        $i = 1;

        while (static::where('subdomain', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePendingApproval($query)
    {
        return $query->where('status', 'pending_platform_approval');
    }
}
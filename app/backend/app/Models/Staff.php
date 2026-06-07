<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Helpers\EthiopianTime;
use Carbon\Carbon;

class Staff extends Model
{
    protected $fillable = [
        'user_id',
        'clinic_id',
        'branch_id',
        'gender',
        'specialization',
        'working_days',
        'time_window',
        'bio',
        'photo',
        'show_on_showcase',
        'is_available',
        'unavailable_reason',
        'unavailable_until',
    ];
    
    protected $casts = [
        'is_available' => 'boolean',
        'show_on_showcase' => 'boolean',
        'unavailable_until' => 'datetime',
    ];
    
    protected $with = ['user'];

    // ── Working Hours Constants (EAT times - direct storage) ──────────────────
    // Clinic operates 08:30–12:00 and 13:30–17:00 EAT
    const MORNING_START_DEFAULT   = '08:30';
    const MORNING_END_DEFAULT     = '12:00';
    const AFTERNOON_START_DEFAULT = '13:30';
    const AFTERNOON_END_DEFAULT   = '17:00';
    const DEFAULT_WORKING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic(Builder $query, ?int $clinicId): Builder
    {
        if ($clinicId === null) {
            return $query->whereRaw('1 = 0');
        }
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        if ($branchId === null) {
            return $query->whereRaw('1 = 0');
        }
        return $query->where('branch_id', $branchId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereHas('user', fn($q) => $q->where('is_active', true));
    }
    
    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('is_available', true)
            ->where(function ($q) {
                $q->whereNull('unavailable_until')
                  ->orWhere('unavailable_until', '<=', now());
            })
            ->whereHas('user', fn($q) => $q->where('is_active', true));
    }
    
    public function scopeDentists(Builder $query): Builder
    {
        return $query->whereHas('user', fn($q) => $q->where('role', 'dentist'));
    }

    // ── Accessors — read identity data from user ──────────────────────────────

    public function getNameAttribute(): string
    {
        return $this->user?->name ?? '';
    }

    public function getEmailAttribute(): string
    {
        return $this->user?->email ?? '';
    }

    public function getPhoneAttribute(): string
    {
        return $this->user?->phone ?? '';
    }

    public function getRoleAttribute(): string
    {
        return $this->user?->role ?? '';
    }

    public function getIsActiveAttribute(): bool
    {
        return (bool) ($this->user?->is_active ?? false);
    }

    /**
     * Get staff ID by user ID (helper method)
     */
    public static function findByUserId(int $userId): ?self
    {
        return self::where('user_id', $userId)->first();
    }
    
    // ── Working Hours Parsers ─────────────────────────────────────────────────
    
    /**
     * Parse time_window string into structured array
     * Supports formats: "08:30-12:00" or "08:30-12:00,13:30-17:00"
     */
    public function getParsedTimeWindow(): array
    {
        if (empty($this->time_window)) {
            return [
                'morning' => [
                    'start' => self::MORNING_START_DEFAULT,
                    'end' => self::MORNING_END_DEFAULT,
                    'enabled' => true,
                ],
                'afternoon' => [
                    'start' => self::AFTERNOON_START_DEFAULT,
                    'end' => self::AFTERNOON_END_DEFAULT,
                    'enabled' => true,
                ],
            ];
        }
        
        $parts = explode(',', $this->time_window);
        $result = [
            'morning' => ['start' => null, 'end' => null, 'enabled' => false],
            'afternoon' => ['start' => null, 'end' => null, 'enabled' => false],
        ];
        
        foreach ($parts as $part) {
            $part = trim($part);
            if (preg_match('/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/', $part, $matches)) {
                $start = $matches[1];
                $end = $matches[2];
                
                // Determine if this is morning or afternoon session
                $startHour = (int) explode(':', $start)[0];
                if ($startHour < 12) {
                    $result['morning'] = ['start' => $start, 'end' => $end, 'enabled' => true];
                } else {
                    $result['afternoon'] = ['start' => $start, 'end' => $end, 'enabled' => true];
                }
            }
        }
        
        // Apply defaults for missing sessions
        if (!$result['morning']['enabled']) {
            $result['morning'] = [
                'start' => self::MORNING_START_DEFAULT,
                'end' => self::MORNING_END_DEFAULT,
                'enabled' => true,
            ];
        }
        
        if (!$result['afternoon']['enabled']) {
            $result['afternoon'] = [
                'start' => self::AFTERNOON_START_DEFAULT,
                'end' => self::AFTERNOON_END_DEFAULT,
                'enabled' => true,
            ];
        }
        
        return $result;
    }
    
    /**
     * Get morning working hours
     */
    public function getMorningHours(): array
    {
        $parsed = $this->getParsedTimeWindow();
        return $parsed['morning'];
    }
    
    /**
     * Get afternoon working hours
     */
    public function getAfternoonHours(): array
    {
        $parsed = $this->getParsedTimeWindow();
        return $parsed['afternoon'];
    }
    
    /**
     * Get working days as array
     * Handles string formats like "Mon-Fri", "Monday,Tuesday,Wednesday", or "monday,tuesday,wednesday"
     */
    public function getWorkingDaysArray(): array
    {
        if (empty($this->working_days)) {
            return self::DEFAULT_WORKING_DAYS;
        }
        
        $days = strtolower($this->working_days);
        
        // Handle "Mon-Fri" format
        if (strpos($days, '-') !== false && strlen($days) < 20) {
            $dayMap = [
                'mon' => 'monday', 'tue' => 'tuesday', 'wed' => 'wednesday',
                'thu' => 'thursday', 'fri' => 'friday', 'sat' => 'saturday',
                'sun' => 'sunday',
            ];
            
            preg_match('/([a-z]+)-([a-z]+)/', $days, $matches);
            if (count($matches) === 3) {
                $start = $dayMap[$matches[1]] ?? $matches[1];
                $end = $dayMap[$matches[2]] ?? $matches[2];
                
                $allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                $startIndex = array_search($start, $allDays);
                $endIndex = array_search($end, $allDays);
                
                if ($startIndex !== false && $endIndex !== false) {
                    return array_slice($allDays, $startIndex, $endIndex - $startIndex + 1);
                }
            }
        }
        
        // Handle comma-separated format
        $daysArray = array_map('trim', explode(',', $days));
        $daysArray = array_map('strtolower', $daysArray);
        
        // Map short names to full names
        $dayMap = [
            'mon' => 'monday', 'tue' => 'tuesday', 'wed' => 'wednesday',
            'thu' => 'thursday', 'fri' => 'friday', 'sat' => 'saturday',
            'sun' => 'sunday',
        ];
        
        $daysArray = array_map(function($day) use ($dayMap) {
            return $dayMap[$day] ?? $day;
        }, $daysArray);
        
        return array_values(array_unique($daysArray));
    }
    
    /**
     * Check if a given date is a working day for this dentist
     */
    public function isWorkingDay(Carbon $date): bool
    {
        $dayOfWeek = strtolower($date->format('l'));
        $workingDays = $this->getWorkingDaysArray();
        return in_array($dayOfWeek, $workingDays);
    }
    
    /**
     * Check if dentist is available at a specific time (time is in EAT)
     */
    public function isAvailableAt(Carbon $dateTime): bool
    {
        // First check global availability flag
        if (!$this->is_available) {
            return false;
        }
        
        // Check if unavailable until date has passed
        if ($this->unavailable_until && $this->unavailable_until->isFuture()) {
            return false;
        }
        
        // Check if it's a working day
        if (!$this->isWorkingDay($dateTime)) {
            return false;
        }
        
        $timeString = $dateTime->format('H:i');
        $morning = $this->getMorningHours();
        $afternoon = $this->getAfternoonHours();
        
        $isInMorning = $morning['enabled'] && $timeString >= $morning['start'] && $timeString < $morning['end'];
        $isInAfternoon = $afternoon['enabled'] && $timeString >= $afternoon['start'] && $timeString < $afternoon['end'];
        
        return $isInMorning || $isInAfternoon;
    }
    
    /**
     * Get all working time slots for a specific date
     * Returns array of [start_time, end_time] pairs as Carbon instances
     */
    public function getWorkingSlotsForDate(Carbon $date): array
    {
        if (!$this->isWorkingDay($date)) {
            return [];
        }
        
        $slots = [];
        $morning = $this->getMorningHours();
        $afternoon = $this->getAfternoonHours();
        
        if ($morning['enabled']) {
            $start = Carbon::parse($date->format('Y-m-d') . ' ' . $morning['start']);
            $end = Carbon::parse($date->format('Y-m-d') . ' ' . $morning['end']);
            $slots[] = ['start' => $start, 'end' => $end];
        }
        
        if ($afternoon['enabled']) {
            $start = Carbon::parse($date->format('Y-m-d') . ' ' . $afternoon['start']);
            $end = Carbon::parse($date->format('Y-m-d') . ' ' . $afternoon['end']);
            $slots[] = ['start' => $start, 'end' => $end];
        }
        
        return $slots;
    }
    
    /**
     * Check if dentist is currently unavailable (sick/vacation/late/left early)
     */
    public function isCurrentlyUnavailable(): bool
    {
        if (!$this->is_available) {
            return true;
        }
        
        if ($this->unavailable_until && $this->unavailable_until->isFuture()) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Mark dentist as unavailable with reason
     */
    public function markUnavailable(string $reason, ?Carbon $until = null): void
    {
        $this->update([
            'is_available' => false,
            'unavailable_reason' => $reason,
            'unavailable_until' => $until,
        ]);
    }
    
    /**
     * Mark dentist as available again
     */
    public function markAvailable(): void
    {
        $this->update([
            'is_available' => true,
            'unavailable_reason' => null,
            'unavailable_until' => null,
        ]);
    }

    // ── Format for API response ───────────────────────────────────────────────

    public function toApiArray(): array
    {
        return [
            'id'               => $this->id,
            'user_id'          => $this->user_id,
            'name'             => $this->name,
            'email'            => $this->email,
            'phone'            => $this->phone,
            'role'             => $this->role,
            'gender'           => $this->gender,
            'is_active'        => $this->is_active,
            'is_available'     => $this->is_available && !$this->isCurrentlyUnavailable(),
            'unavailable_reason' => $this->unavailable_reason,
            'unavailable_until'  => $this->unavailable_until?->toDateTimeString(),
            'clinic_id'        => $this->clinic_id,
            'branch_id'        => $this->branch_id,
            'branch'           => $this->branch ? [
                'id'   => $this->branch->id,
                'name' => $this->branch->name,
            ] : null,
            'specialization'   => $this->specialization,
            'working_days'     => $this->working_days,
            'working_days_array' => $this->getWorkingDaysArray(),
            'time_window'      => $this->time_window,
            'working_hours'    => [
                'morning' => array_merge($this->getMorningHours(), [
                    'ett_start' => $this->getMorningHours()['enabled'] ? EthiopianTime::fromTimeString($this->getMorningHours()['start']) : null,
                    'ett_end'   => $this->getMorningHours()['enabled'] ? EthiopianTime::fromTimeString($this->getMorningHours()['end']) : null,
                ]),
                'afternoon' => array_merge($this->getAfternoonHours(), [
                    'ett_start' => $this->getAfternoonHours()['enabled'] ? EthiopianTime::fromTimeString($this->getAfternoonHours()['start']) : null,
                    'ett_end'   => $this->getAfternoonHours()['enabled'] ? EthiopianTime::fromTimeString($this->getAfternoonHours()['end']) : null,
                ]),
            ],
            'bio'              => $this->bio,
            'photo'            => $this->photo,
            'photo_url'        => $this->photo
                ? asset('storage/' . $this->photo)
                : null,
            'show_on_showcase' => $this->show_on_showcase,
            'created_at'       => $this->created_at?->toDateString(),
        ];
    }
}
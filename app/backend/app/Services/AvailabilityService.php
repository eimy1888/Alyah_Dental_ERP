<?php

namespace App\Services;

use App\Models\Staff;
use App\Models\Appointment;
use App\Helpers\EthiopianTime;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AvailabilityService
{
    private const CACHE_TTL            = 300; // 5 minutes
    private const DEFAULT_SLOT_INTERVAL = 30;
    private const ETHIOPIAN_TZ          = 'Africa/Addis_Ababa';

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get available time slots for a dentist on a specific date.
     * All times use Ethiopian timezone.
     *
     * @param  Staff   $dentist
     * @param  Carbon  $date
     * @param  int     $durationMinutes  — FIX: typed int, callers must cast
     * @return array
     */
    public function getAvailableSlots(Staff $dentist, Carbon $date, int $durationMinutes = self::DEFAULT_SLOT_INTERVAL): array
    {
        // Sanitize — defensive even though the param is typed
        $durationMinutes = max(15, min(180, (int) $durationMinutes));

        $cacheKey = $this->buildCacheKey($dentist, $date, $durationMinutes);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($dentist, $date, $durationMinutes) {
            return $this->calculateAvailableSlots($dentist, $date, $durationMinutes);
        });
    }

    /**
     * Check if a specific dentist is available at a given datetime.
     *
     * @param  Staff   $dentist
     * @param  Carbon  $dateTime
     * @param  int     $durationMinutes  — FIX: cast to int here so string input never reaches buildCacheKey
     * @return bool
     */
    public function isDentistAvailableAt(Staff $dentist, Carbon $dateTime, int $durationMinutes = self::DEFAULT_SLOT_INTERVAL): bool
    {
        // ── FIX: explicit cast — HTTP request params arrive as strings ────────
        $durationMinutes = (int) $durationMinutes;

        if ($durationMinutes < 15) {
            $durationMinutes = self::DEFAULT_SLOT_INTERVAL;
        }

        // Fast checks first (cheapest)
        if ($dentist->isCurrentlyUnavailable()) {
            return false;
        }

        if (!$dentist->isWorkingDay($dateTime)) {
            return false;
        }

        if (!$dentist->isAvailableAt($dateTime)) {
            return false;
        }

        // Expensive DB check last
        $slotEnd = $dateTime->copy()->addMinutes($durationMinutes);

        return !Appointment::where('dentist_id', $dentist->user_id)
            ->whereDate('appointment_time', $dateTime->toDateString())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($query) use ($dateTime, $slotEnd) {
                $query->where('appointment_time', '<', $slotEnd)
                    ->whereRaw(\App\Helpers\DbHelper::appointmentEndGt(), [$dateTime]);
            })
            ->exists();
    }

    /**
     * Get all available dentists for a specific date and time.
     */
    public function getAvailableDentists(Carbon $dateTime, int $clinicId, int $branchId, int $durationMinutes = self::DEFAULT_SLOT_INTERVAL): Collection
    {
        $durationMinutes = max(15, min(180, (int) $durationMinutes));

        $dentists = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->available()
            ->dentists()
            ->with('user')
            ->get();

        return $dentists->filter(function ($dentist) use ($dateTime, $durationMinutes) {
            return $this->isDentistAvailableAt($dentist, $dateTime, $durationMinutes);
        })->values();
    }

    /**
     * Get the next available slot for a dentist after a given time.
     */
    public function getNextAvailableSlot(Staff $dentist, Carbon $afterTime, int $durationMinutes = self::DEFAULT_SLOT_INTERVAL): ?array
    {
        $durationMinutes = max(15, min(180, (int) $durationMinutes));
        $maxDaysToCheck  = 30;
        $date            = $afterTime->copy()->startOfDay();

        for ($i = 0; $i < $maxDaysToCheck; $i++) {
            $checkDate = $date->copy()->addDays($i);

            if (!$dentist->isWorkingDay($checkDate)) {
                continue;
            }

            $workingSlots = $dentist->getWorkingSlotsForDate($checkDate);
            if (empty($workingSlots)) {
                continue;
            }

            $bookedAppointments = $this->getBookedAppointmentsOptimized($dentist, $checkDate);

            foreach ($workingSlots as $workingSlot) {
                $slotStart = $checkDate->isSameDay($afterTime)
                    ? max($workingSlot['start'], $afterTime)
                    : $workingSlot['start'];

                if ($slotStart >= $workingSlot['end']) {
                    continue;
                }

                $currentStart = clone $slotStart;

                while ($currentStart->copy()->addMinutes($durationMinutes)->lte($workingSlot['end'])) {
                    $slotEnd = $currentStart->copy()->addMinutes($durationMinutes);

                    if (!$this->isOverlappingWithAny($currentStart, $slotEnd, $bookedAppointments)) {
                        return [
                            'start' => $currentStart->toDateTimeString(),
                            'end'   => $slotEnd->toDateTimeString(),
                            'date'  => $checkDate->toDateString(),
                            'time'  => $currentStart->format('H:i'),
                            'ett_time' => EthiopianTime::toEthiopian($currentStart),
                        ];
                    }

                    $currentStart->addMinutes($durationMinutes);
                }
            }
        }

        return null;
    }

    /**
     * Calculate estimated wait time for a dentist (Ethiopian time).
     */
    public function calculateEstimatedWaitTime(Staff $dentist, Carbon $dateTime): int
    {
        $appointments = Appointment::where('dentist_id', $dentist->user_id)
            ->whereDate('appointment_time', $dateTime->toDateString())
            ->whereIn('status', ['confirmed', 'checked_in', 'in_progress'])
            ->where('appointment_time', '>=', $dateTime)
            ->orderBy('appointment_time')
            ->get(['duration_minutes', 'status', 'start_time']);

        $totalWaitMinutes = $appointments->sum(fn($a) => (int) $a->duration_minutes);

        $inProgress = $appointments->firstWhere('status', 'in_progress');
        if ($inProgress && $inProgress->start_time) {
            $elapsed          = (int) now()->diffInMinutes($inProgress->start_time);
            $totalWaitMinutes = max(0, $totalWaitMinutes - $elapsed);
        }

        return (int) round($totalWaitMinutes);
    }

    /**
     * Clear cache for a dentist's availability on a given date.
     * Uses a tag-free approach for broad cache drivers (file, database).
     */
    public function clearCache(Staff $dentist, Carbon $date): void
    {
        // Clear all common durations (15, 30, 45, 60, 90, 120, 150, 180 min)
        $durations = [15, 30, 45, 60, 90, 120, 150, 180];
        foreach ($durations as $dur) {
            Cache::forget($this->buildCacheKey($dentist, $date, $dur));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function calculateAvailableSlots(Staff $dentist, Carbon $date, int $durationMinutes): array
    {
        if (!$dentist->isWorkingDay($date)) {
            return [];
        }

        $workingSlots = $dentist->getWorkingSlotsForDate($date);
        if (empty($workingSlots)) {
            return [];
        }

        $bookedAppointments = $this->getBookedAppointmentsOptimized($dentist, $date);
        $isToday            = $date->isToday();
        $now                = Carbon::now(self::ETHIOPIAN_TZ);
        $availableSlots     = [];

        foreach ($workingSlots as $workingSlot) {
            $currentStart = clone $workingSlot['start'];
            $sessionEnd   = clone $workingSlot['end'];

            if ($isToday && $currentStart->lt($now)) {
                $currentStart = $this->roundToNextSlot($now, $durationMinutes);
                if ($currentStart->gte($sessionEnd)) {
                    continue;
                }
            }

            $slots = $this->generateSlotsEfficiently(
                $currentStart,
                $sessionEnd,
                $durationMinutes,
                $bookedAppointments
            );

            $availableSlots = array_merge($availableSlots, $slots);
        }

        return $availableSlots;
    }

    private function getBookedAppointmentsOptimized(Staff $dentist, Carbon $date): Collection
    {
        return Appointment::where('dentist_id', $dentist->user_id)
            ->whereDate('appointment_time', $date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->orderBy('appointment_time', 'asc')
            ->get(['appointment_time', 'duration_minutes'])
            ->map(function ($appointment) {
                return (object) [
                    'start' => $appointment->appointment_time,
                    'end'   => $appointment->appointment_time->copy()->addMinutes((int) $appointment->duration_minutes),
                ];
            });
    }

    private function roundToNextSlot(Carbon $time, int $slotInterval): Carbon
    {
        $minutes        = $time->minute;
        $roundedMinutes = (int) ceil($minutes / $slotInterval) * $slotInterval;

        if ($roundedMinutes >= 60) {
            return $time->copy()->addHour()->minute(0)->second(0);
        }

        return $time->copy()->minute($roundedMinutes)->second(0);
    }

    private function generateSlotsEfficiently(
        Carbon     $start,
        Carbon     $end,
        int        $duration,
        Collection $bookedAppointments
    ): array {
        $slots       = [];
        $current     = clone $start;
        $bookedIndex = 0;
        $bookedCount = $bookedAppointments->count();

        while ($current->copy()->addMinutes($duration)->lte($end)) {
            $slotEnd = $current->copy()->addMinutes($duration);

            // Advance pointer past appointments that ended before current slot
            while ($bookedIndex < $bookedCount && $bookedAppointments[$bookedIndex]->end->lte($current)) {
                $bookedIndex++;
            }

            $isOverlapping = false;
            for ($i = $bookedIndex; $i < $bookedCount; $i++) {
                $apt = $bookedAppointments[$i];

                if ($apt->start->gte($slotEnd)) {
                    // All remaining appointments start after this slot — safe
                    break;
                }

                if ($this->isOverlapping($current, $slotEnd, $apt)) {
                    $current       = $apt->end->copy();
                    $isOverlapping = true;
                    break;
                }
            }

            if (!$isOverlapping) {
                $slots[] = [
                    'start'           => $current->format('H:i'),
                    'end'             => $slotEnd->format('H:i'),
                    'ett_start'       => EthiopianTime::toEthiopian($current),
                    'ett_end'         => EthiopianTime::toEthiopian($slotEnd),
                    'start_timestamp' => $current->toDateTimeString(),
                    'end_timestamp'   => $slotEnd->toDateTimeString(),
                    'available'       => true,
                ];
                $current->addMinutes($duration);
            }
        }

        return $slots;
    }

    private function isOverlapping(Carbon $slotStart, Carbon $slotEnd, object $appointment): bool
    {
        return $slotStart->lt($appointment->end) && $slotEnd->gt($appointment->start);
    }

    private function isOverlappingWithAny(Carbon $slotStart, Carbon $slotEnd, Collection $appointments): bool
    {
        foreach ($appointments as $apt) {
            if ($this->isOverlapping($slotStart, $slotEnd, $apt)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build a deterministic cache key.
     * All params are cast to their correct types before formatting.
     *
     * FIX: $durationMinutes was typed as int in the signature but PHP's HTTP
     * layer sends strings. The (int) cast here is the final safety net.
     */
    private function buildCacheKey(Staff $dentist, Carbon $date, int $durationMinutes): string
    {
        return sprintf(
            'availability:d%d:uid%d:date%s:dur%d',
            (int) $dentist->id,
            (int) $dentist->user_id,
            $date->toDateString(),
            (int) $durationMinutes    // ← THE ORIGINAL CRASH SITE
        );
    }
}
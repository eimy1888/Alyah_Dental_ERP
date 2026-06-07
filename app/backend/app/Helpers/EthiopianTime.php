<?php

namespace App\Helpers;

use Carbon\Carbon;

/**
 * Ethiopian Traditional Time (ETT) Helper
 *
 * Ethiopia uses a 12-hour clock that is offset by 6 hours from standard time.
 * The Ethiopian day starts at sunrise (~6:00 AM standard), so:
 *
 *   Standard 06:00  =  Ethiopian  0:00 (midnight / start of day)
 *   Standard 08:30  =  Ethiopian  2:30 (ሁለት ሰዓት ተኩል ጥዋት)
 *   Standard 12:00  =  Ethiopian  6:00 (ስድስት ሰዓት)
 *   Standard 13:30  =  Ethiopian  7:30 (ሰባት ሰዓት ተኩል ቀን)
 *   Standard 17:00  =  Ethiopian 11:00 (አስራ አንድ ሰዓት ቀን)
 *   Standard 20:00  =  Ethiopian  2:00 (ሁለት ሰዓት ሌሊት)
 *
 * Conversion:  ETT_hour = (standard_hour - 6 + 24) % 24
 *
 * Period labels:
 *   00:00–05:59 standard  →  ሌሊት  (lelit  / night)
 *   06:00–11:59 standard  →  ጥዋት  (tjwat  / morning)
 *   12:00–17:59 standard  →  ቀን   (ken    / afternoon/day)
 *   18:00–23:59 standard  →  ምሽት  (misht  / evening)
 */
class EthiopianTime
{
    /**
     * Convert a standard Carbon datetime to Ethiopian traditional time string.
     *
     * @param  Carbon|string  $time   Standard datetime or "HH:MM" string
     * @param  bool           $showPeriod  Append the Amharic period label
     * @return string  e.g. "2:30" or "2:30 ጥዋት"
     */
    public static function toEthiopian(Carbon|string $time, bool $showPeriod = true): string
    {
        if (is_string($time)) {
            $time = Carbon::parse($time);
        }

        $stdHour   = (int) $time->format('G');   // 0-23
        $minute    = (int) $time->format('i');
        $ettHour   = ($stdHour - 6 + 24) % 24;  // shift back 6 hours

        // Use 12-hour display (1–12)
        $display12 = $ettHour % 12;
        if ($display12 === 0) {
            $display12 = 12;
        }

        $formatted = sprintf('%d:%02d', $display12, $minute);

        if ($showPeriod) {
            $formatted .= ' ' . self::periodLabel($stdHour);
        }

        return $formatted;
    }

    /**
     * Convert a "HH:MM" working-hours string to Ethiopian traditional time string.
     * Used for time_window display (e.g. "08:30" → "2:30 ጥዋት").
     *
     * @param  string  $timeStr   "HH:MM" in standard time
     * @param  bool    $showPeriod
     * @return string
     */
    public static function fromTimeString(string $timeStr, bool $showPeriod = true): string
    {
        return self::toEthiopian(Carbon::parse($timeStr), $showPeriod);
    }

    /**
     * Convert a standard Carbon datetime to Ethiopian traditional time
     * and return just "H:MM" with no period label (for machine use / sorting).
     *
     * @param  Carbon|string  $time
     * @return string  e.g. "2:30"
     */
    public static function toEthiopianRaw(Carbon|string $time): string
    {
        return self::toEthiopian($time, false);
    }

    /**
     * Return the Amharic period label for a given standard hour (0–23).
     */
    public static function periodLabel(int $stdHour): string
    {
        if ($stdHour >= 6 && $stdHour < 12) {
            return 'ጥዋት';   // morning
        }
        if ($stdHour >= 12 && $stdHour < 18) {
            return 'ቀን';    // afternoon/day
        }
        if ($stdHour >= 18 && $stdHour < 24) {
            return 'ምሽት';   // evening
        }
        return 'ሌሊት';       // night (00:00–05:59)
    }

    /**
     * Format a Carbon datetime with both standard and Ethiopian times.
     * e.g. "08:30 (2:30 ጥዋት)"
     *
     * @param  Carbon|string  $time
     * @return string
     */
    public static function withBoth(Carbon|string $time): string
    {
        if (is_string($time)) {
            $time = Carbon::parse($time);
        }

        return $time->format('H:i') . ' (' . self::toEthiopian($time) . ')';
    }
}

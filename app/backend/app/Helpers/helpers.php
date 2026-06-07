<?php

use App\Helpers\EthiopianTime;
use Carbon\Carbon;

if (!function_exists('ett')) {
    /**
     * Convert standard time to Ethiopian Traditional Time string.
     * Short alias for EthiopianTime::toEthiopian().
     *
     * @param  Carbon|string  $time
     * @param  bool           $showPeriod
     * @return string  e.g. "2:30 ጥዋት"
     */
    function ett(Carbon|string $time, bool $showPeriod = true): string
    {
        return EthiopianTime::toEthiopian($time, $showPeriod);
    }
}

if (!function_exists('ett_raw')) {
    /**
     * Convert standard time to Ethiopian Traditional Time string (no period label).
     *
     * @param  Carbon|string  $time
     * @return string  e.g. "2:30"
     */
    function ett_raw(Carbon|string $time): string
    {
        return EthiopianTime::toEthiopianRaw($time);
    }
}

<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class DbHelper
{
    /**
     * Returns a DB-agnostic raw expression for:
     *   appointment_time + duration_minutes > $value
     *
     * MySQL:  DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE)
     * SQLite: datetime(appointment_time, '+' || duration_minutes || ' minutes')
     */
    public static function appointmentEndExpr(): string
    {
        return match (DB::getDriverName()) {
            'sqlite' => "datetime(appointment_time, '+' || duration_minutes || ' minutes')",
            default  => "DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE)",
        };
    }

    /**
     * Build the overlap condition raw fragment.
     * Returns: "DATE_ADD(appointment_time,...) > ?"  or sqlite equivalent
     */
    public static function appointmentEndGt(): string
    {
        return self::appointmentEndExpr() . ' > ?';
    }
}

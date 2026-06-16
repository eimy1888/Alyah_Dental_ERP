<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Staff;
use App\Models\TreatmentPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * REQ-6 / REQ-7: Specialist auto-assignment after invoice payment.
 *
 * Mapping rules (REQ-6):
 *   Root canal          → Endodontist
 *   Braces / ortho      → Orthodontist
 *   Surgery / extraction→ Oral Surgeon
 *   Crown / bridge      → Prosthodontist
 *   Everything else     → GP (REQ-7)
 */
class SpecialistAssignmentService
{
    // Keyword → specialization mapping
    private const SPECIALIST_MAP = [
        'endodontist'    => ['root canal', 'endodontic', 'pulp'],
        'orthodontist'   => ['braces', 'orthodontic', 'aligner', 'retainer', 'malocclusion'],
        'oral surgeon'   => ['surgery', 'surgical', 'extraction complex', 'implant', 'jaw', 'wisdom'],
        'prosthodontist' => ['crown', 'bridge', 'prosthetic', 'full denture', 'veneer', 'prosthodontic'],
    ];

    /**
     * Determine required specialist type from procedure/diagnosis text.
     * Returns null if GP can handle it (REQ-7).
     */
    public static function determineSpecialistType(string $diagnosis, array $procedureNames = []): ?string
    {
        $text = strtolower($diagnosis . ' ' . implode(' ', $procedureNames));

        foreach (self::SPECIALIST_MAP as $specialistType => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($text, $keyword)) {
                    return ucwords($specialistType);
                }
            }
        }

        return null; // GP handles it
    }

    /**
     * REQ-6: Auto-schedule specialist appointment after payment.
     * Called from Invoice::triggerPostPaymentAutomations().
     */
    public static function scheduleSpecialistAppointment(
        TreatmentPlan $plan,
        Appointment $originalAppointment
    ): ?Appointment {
        try {
            $specialistType = $plan->specialist_type;
            if (empty($specialistType)) return null;

            $clinicId = $plan->clinic_id;
            $branchId = $plan->branch_id;

            // Find available specialist of required type — least busy today first
            $specialist = self::findBestSpecialist($specialistType, $clinicId, $branchId);
            if (!$specialist) {
                Log::warning("[SpecialistAssignment] No available specialist of type: {$specialistType}");
                return null;
            }

            // Find earliest available slot
            $appointmentTime = self::findEarliestSlot($specialist, $clinicId, $branchId);

            $appointment = Appointment::create([
                'clinic_id'        => $clinicId,
                'branch_id'        => $branchId,
                'patient_id'       => $plan->patient_id,
                'dentist_id'       => $specialist->user_id,
                'appointment_time' => $appointmentTime,
                'duration_minutes' => 60,
                'type'             => "Specialist — {$specialistType}",
                'status'           => Appointment::STATUS_CONFIRMED,
                'notes'            => "Auto-scheduled by system. Specialist referral from Plan: {$plan->title}",
                'created_by'       => $plan->gp_id,
                'treatment_plan_id'=> $plan->id,
                'appointment_kind' => 'treatment',
                'billing_model'    => Appointment::BILLING_TREATMENT,
            ]);

            // Notify specialist
            DB::table('notifications')->insert([
                'id'              => \Illuminate\Support\Str::uuid(),
                'type'            => 'specialist_appointment_assigned',
                'notifiable_type' => User::class,
                'notifiable_id'   => $specialist->user_id,
                'data'            => json_encode([
                    'title'   => 'New Specialist Referral',
                    'message' => "Patient {$plan->patient?->full_name} referred for {$specialistType} — " .
                                 $appointmentTime->format('d M Y H:i'),
                    'appointment_id' => $appointment->id,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Notify patient
            $patientUser = User::where('clinic_id', $clinicId)
                ->where('role', 'patient')
                ->where(function ($q) use ($plan) {
                    if ($plan->patient?->email) $q->orWhere('email', $plan->patient->email);
                    if ($plan->patient?->phone) $q->orWhere('phone', $plan->patient->phone);
                })->first();

            if ($patientUser) {
                DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'specialist_appointment_booked',
                    'notifiable_type' => User::class,
                    'notifiable_id'   => $patientUser->id,
                    'data'            => json_encode([
                        'title'   => 'Specialist Appointment Booked',
                        'message' => "Your specialist appointment has been booked — Dr. {$specialist->name} ({$specialistType}) — " .
                                     $appointmentTime->format('d M Y') . ' at ' . $appointmentTime->format('H:i'),
                        'appointment_id' => $appointment->id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $appointment;

        } catch (\Throwable $e) {
            Log::error("[SpecialistAssignment] Failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Find the best available specialist of the required type.
     * Picks: least busy today → if none today, earliest available date.
     */
    private static function findBestSpecialist(string $specialistType, int $clinicId, ?int $branchId): ?Staff
    {
        $query = Staff::where('clinic_id', $clinicId)
            ->available()
            ->whereHas('user', fn($q) => $q->where('role', 'dentist'))
            ->where(function ($q) use ($specialistType) {
                $q->where('specialization', 'like', "%{$specialistType}%");
            });

        if ($branchId) $query->where('branch_id', $branchId);

        $candidates = $query->with('user')->get();

        if ($candidates->isEmpty()) return null;

        // Sort by fewest appointments today
        return $candidates->sortBy(function ($staff) use ($clinicId, $branchId) {
            return Appointment::where('clinic_id', $clinicId)
                ->where('dentist_id', $staff->user_id)
                ->whereDate('appointment_time', today())
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->count();
        })->first();
    }

    /**
     * Find earliest available appointment slot for a specialist.
     */
    private static function findEarliestSlot(Staff $specialist, int $clinicId, ?int $branchId): Carbon
    {
        $tz = 'Africa/Addis_Ababa';
        $date = Carbon::now($tz)->startOfDay();

        // Try today first, then loop forward up to 30 days
        for ($i = 0; $i <= 30; $i++) {
            $checkDate = $date->copy()->addDays($i);
            if (!$specialist->isWorkingDay($checkDate)) continue;

            // Try 09:00 first, then 10:00, 11:00, 14:00, 15:00, 16:00
            $trialTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            foreach ($trialTimes as $time) {
                $candidate = Carbon::parse($checkDate->format('Y-m-d') . ' ' . $time, $tz);
                if ($candidate->isPast()) continue;

                $hasOverlap = Appointment::where('clinic_id', $clinicId)
                    ->where('dentist_id', $specialist->user_id)
                    ->whereDate('appointment_time', $candidate->toDateString())
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->where(function ($q) use ($candidate) {
                        $q->where('appointment_time', '<', $candidate->copy()->addMinutes(60))
                          ->whereRaw("DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE) > ?", [$candidate]);
                    })->exists();

                if (!$hasOverlap) return $candidate;
            }
        }

        // Fallback: next weekday 09:00
        return Carbon::now($tz)->addDay()->startOfDay()->setTime(9, 0);
    }
}

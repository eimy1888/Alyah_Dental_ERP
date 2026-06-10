<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Staff;
use App\Models\User;
use App\Models\Invoice;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ManagerAppointmentController extends Controller
{
    // ── Working Hours Constants (EAT times - direct storage) ──────────────────
    // Clinic operates 08:30–12:00 and 13:30–17:00 EAT
    private const DEFAULT_MORNING_START   = '08:30';
    private const DEFAULT_MORNING_END     = '12:00';
    private const DEFAULT_AFTERNOON_START = '13:30';
    private const DEFAULT_AFTERNOON_END   = '17:00';
    private const SLOT_MINUTES            = 30;
    private const CACHE_TTL               = 300;
    private const ETHIOPIAN_TZ            = 'Africa/Addis_Ababa';
    private const NO_SHOW_GRACE_MINUTES   = 10;

    public function index(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        // Auto-mark no-show appointments for today
        $this->autoMarkNoShows($clinicId, $branchId);

        $query = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->with(['patient', 'dentist'])
            ->orderByDesc('appointment_time');

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->whereHas('patient', function ($pq) use ($term) {
                    $pq->where('first_name', 'like', "%{$term}%")
                       ->orWhere('last_name', 'like', "%{$term}%");
                })
                ->orWhereHas('dentist', function ($dq) use ($term) {
                    $dq->where('name', 'like', "%{$term}%");
                })
                ->orWhere('type', 'like', "%{$term}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('appointment_time', $request->date);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('appointment_time', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('appointment_time', '<=', $request->to_date);
        }

        $appointments = $query->get()->map(fn($a) => $this->format($a));

        return response()->json([
            'success' => true,
            'data'    => $appointments,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $appointment = Appointment::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->with(['patient', 'dentist'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $this->format($appointment),
        ]);
    }

    /**
     * STORE - with Clinic Card Check + Notification
     */
    public function store(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $request->validate([
            'patient_id'       => 'required|integer|exists:patients,id',
            'dentist_id'       => 'required|integer|exists:staff,id',
            'appointment_time' => 'required|date',
            'duration_minutes' => 'nullable|integer|min:15|max:180',
            'type'             => 'required|string|max:100',
            'notes'            => 'nullable|string|max:1000',
            'status'           => [
                'nullable',
                Rule::in([
                    'pending', 'confirmed', 'checked_in',
                    'in_progress', 'treatment_started', 'completed', 'no_show', 'cancelled',
                ]),
            ],
            // v2 billing
            'service_id'    => 'nullable|exists:services,id',
            'billing_model' => 'nullable|in:service,treatment,hybrid',
        ]);

        // ─────────────────────────────────────────────────────────
        // CHECK IF PATIENT HAS ACTIVE CLINIC CARD
        // ─────────────────────────────────────────────────────────
        $patient = Patient::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->find($request->patient_id);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
                'code'    => 'PATIENT_NOT_FOUND',
            ], 404);
        }

        if (!$patient->hasActiveCard()) {
            // Check if there's an unpaid card invoice
            $unpaidCardInvoice = Invoice::where('clinic_id', $clinicId)
                ->where('branch_id', $branchId)
                ->where('patient_id', $patient->id)
                ->where('status', '!=', 'paid')
                ->whereHas('items', function($q) {
                    $q->where('description', 'like', '%Clinic Card%');
                })
                ->first();

            return response()->json([
                'success' => false,
                'message' => 'Patient does not have an active clinic card. Please complete the card payment first before booking appointments.',
                'code'    => 'CARD_REQUIRED',
                'data'    => [
                    'has_active_card'           => false,
                    'unpaid_card_invoice_id'    => $unpaidCardInvoice?->id,
                    'unpaid_card_invoice_number'=> $unpaidCardInvoice?->invoice_number,
                    'unpaid_amount'             => $unpaidCardInvoice?->balance,
                ],
            ], 402);
        }

        $patientActiveAppointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('patient_id', $patient->id)
            ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
            ->exists();

        if ($patientActiveAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'Patient already has an active appointment. Cannot book another until it is completed or cancelled.',
                'code'    => 'PATIENT_ACTIVE_APPOINTMENT',
            ], 409);
        }

        $staff = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('id', $request->dentist_id)
            ->with('user')
            ->first();

        if (!$staff || !$staff->user) {
            return response()->json([
                'success' => false,
                'message' => 'Selected dentist not found.',
            ], 422);
        }

        $dentistUserId   = $staff->user->id;
        $appointmentTime = Carbon::parse($request->appointment_time);
        $duration        = $request->duration_minutes ?? self::SLOT_MINUTES;
        $appointmentEnd  = (clone $appointmentTime)->addMinutes($duration);

        $dentistOverlap = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentistUserId)
            ->whereDate('appointment_time', $appointmentTime->toDateString())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($q) use ($appointmentTime, $appointmentEnd) {
                $q->where('appointment_time', '<', $appointmentEnd)
                  ->whereRaw(
                      "DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE) > ?",
                      [$appointmentTime]
                  );
            })
            ->exists();

        if ($dentistOverlap) {
            return response()->json([
                'success' => false,
                'message' => 'Dentist already has an appointment overlapping this time slot.',
                'code'    => 'DENTIST_OVERLAP',
            ], 409);
        }

        $appointment = Appointment::create([
            'clinic_id'        => $clinicId,
            'branch_id'        => $branchId,
            'patient_id'       => $patient->id,
            'dentist_id'       => $dentistUserId,
            'appointment_time' => $appointmentTime,
            'duration_minutes' => $duration,
            'type'             => $request->type,
            'notes'            => $request->notes,
            'status'           => $request->status ?? 'confirmed',
            'created_by'       => $manager->id,
            'is_notified'      => false,
            // v2 billing
            'service_id'    => $request->service_id ?? null,
            'billing_model' => $request->billing_model ?? null,
        ]);

        $appointment->load(['patient', 'dentist', 'service']);

        // ── v2: Resolve billing model and create invoices/episodes ──
        app(\App\Services\BillingModelResolver::class)->resolveAtBooking($appointment, $manager);
        $appointment->refresh();

        // ── Dispatch notification to branch manager ──
        NotificationService::appointmentBooked($appointment, $manager);

        return response()->json([
            'success' => true,
            'message' => 'Appointment booked successfully.',
            'data'    => array_merge(
                $this->format($appointment),
                ['billing' => $appointment->getBillingSummary()]
            ),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $appointment = Appointment::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->findOrFail($id);

        $request->validate([
            'patient_id'       => 'sometimes|integer|exists:patients,id',
            'dentist_id'       => 'sometimes|integer|exists:staff,id',
            'appointment_time' => 'sometimes|date',
            'duration_minutes' => 'nullable|integer|min:15|max:180',
            'type'             => 'sometimes|string|max:100',
            'notes'            => 'nullable|string|max:1000',
            'status'           => [
                'sometimes',
                Rule::in([
                    'pending', 'confirmed', 'checked_in',
                    'in_progress', 'treatment_started', 'completed', 'no_show', 'cancelled',
                ]),
            ],
        ]);

        $data = $request->only([
            'patient_id', 'duration_minutes',
            'type', 'notes', 'status',
        ]);

        if ($request->filled('dentist_id')) {
            $staff = Staff::where('clinic_id', $manager->clinic_id)
                ->where('branch_id', $manager->branch_id)
                ->where('id', $request->dentist_id)
                ->with('user')
                ->first();
            if ($staff && $staff->user) {
                $data['dentist_id'] = $staff->user->id;
            }
        }

        if ($request->filled('appointment_time')) {
            $data['appointment_time'] = Carbon::parse($request->appointment_time);
        }

        $appointment->update($data);
        $appointment->load(['patient', 'dentist']);

        return response()->json([
            'success' => true,
            'message' => 'Appointment updated successfully.',
            'data'    => $this->format($appointment->fresh(['patient', 'dentist'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $manager = $request->user();

        $appointment = Appointment::where('clinic_id', $manager->clinic_id)
            ->where('branch_id', $manager->branch_id)
            ->findOrFail($id);

        $appointment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Appointment deleted successfully.',
        ]);
    }

    /**
     * Check-in appointment - ONLY allows if patient has active card
     * No invoice creation anymore
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->with(['patient', 'dentist'])
            ->findOrFail($id);

        // Check if appointment is in confirmed status
        if ($appointment->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'code'    => 'INVALID_STATUS',
                'message' => "Cannot check in. Appointment status is '{$appointment->status}'.",
            ], 422);
        }

        // Check if patient is blocked
        if ($appointment->patient && $appointment->patient->is_blocked) {
            return response()->json([
                'success' => false,
                'code'    => 'PATIENT_BLOCKED',
                'message' => 'Patient is blocked. Cannot check in.',
            ], 422);
        }

        // CRITICAL: Check if patient has an active card
        $hasActiveCard = $appointment->patient && $appointment->patient->hasActiveCard();
        
        if (!$hasActiveCard) {
            return response()->json([
                'success' => false,
                'code'    => 'NO_ACTIVE_CARD',
                'message' => 'Patient does not have an active clinic card. Please renew membership before check-in.',
            ], 402);
        }

        // Calculate lateness using Ethiopian time
        $tz              = self::ETHIOPIAN_TZ;
        $appointmentTime = $appointment->appointment_time->setTimezone($tz);
        $nowEt           = Carbon::now($tz);
        $lateMinutes     = max(0, (int) $nowEt->diffInMinutes($appointmentTime, false));
        $isLate          = $lateMinutes > 0;
        $lateCategory    = null;

        if ($isLate) {
            if ($lateMinutes <= 15)      $lateCategory = 'on_time';
            elseif ($lateMinutes <= 30)  $lateCategory = 'moderate';
            else                         $lateCategory = 'severe';
        }

        // Update appointment status
        $appointment->update([
            'status'        => 'checked_in',
            'check_in_time' => now(),
            'is_late'       => $isLate,
            'late_minutes'  => max(0, $lateMinutes),
        ]);

        // Add to queue
        $priority     = $lateCategory === 'severe' ? 'late_arrival' : 'scheduled';
        $lastPosition = \App\Models\QueueItem::forClinic($clinicId)
            ->forBranch($branchId)
            ->forDentist($appointment->dentist_id)
            ->where('status', 'waiting')
            ->where('priority', $priority)
            ->max('position') ?? 0;

        \App\Models\QueueItem::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $branchId,
            'appointment_id' => $appointment->id,
            'patient_id'     => $appointment->patient_id,
            'dentist_id'     => $appointment->dentist_id,
            'priority'       => $priority,
            'position'       => $lastPosition + 1,
            'status'         => 'waiting',
            'notes'          => $lateCategory === 'severe'
                ? "Late arrival — {$lateMinutes} min late"
                : ($lateCategory === 'moderate' ? "Moderate delay — {$lateMinutes} min late" : null),
        ]);

        $appointment->load(['patient', 'dentist']);

        $messageParts = ["Patient checked in successfully (Active card verified)"];

        if ($lateCategory === 'severe')       $messageParts[] = "{$lateMinutes} min late — placed at end of queue";
        elseif ($lateCategory === 'moderate') $messageParts[] = "{$lateMinutes} min late — position adjusted";
        elseif ($isLate)                      $messageParts[] = "{$lateMinutes} min late — position kept";

        return response()->json([
            'success' => true,
            'message' => implode('. ', $messageParts) . '.',
            'data'    => $this->format($appointment),
        ]);
    }

    /**
     * Auto-mark appointments as no-show if they started more than grace period ago
     */
    private function autoMarkNoShows(int $clinicId, ?int $branchId): void
    {
        $tz = self::ETHIOPIAN_TZ;
        $now = Carbon::now($tz);
        $today = $now->copy()->startOfDay();

        // Get all confirmed appointments for today that have ended
        $query = Appointment::where('clinic_id', $clinicId)
            ->whereDate('appointment_time', $today)
            ->where('status', 'confirmed');

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        $appointments = $query->get();

        foreach ($appointments as $appointment) {
            $appointmentStart = $appointment->appointment_time;
            $appointmentEnd = $appointmentStart->copy()->addMinutes($appointment->duration_minutes);
            
            // If current time is past the appointment end time + grace period
            $noShowTime = $appointmentEnd->copy()->addMinutes(self::NO_SHOW_GRACE_MINUTES);
            
            if ($now->gte($noShowTime)) {
                $appointment->update(['status' => 'no_show']);
                Log::info("Auto-marked appointment #{$appointment->id} as no-show", [
                    'appointment_time' => $appointmentStart->toDateTimeString(),
                    'current_time' => $now->toDateTimeString()
                ]);
            }
        }
    }

    /**
     * Get availability — with real-time free slot calculation (using EAT times)
     */
    public function availability(Request $request): JsonResponse
    {
        $manager  = $request->user();
        $clinicId = $manager->clinic_id;
        $branchId = $manager->branch_id;

        // Auto-mark no-shows first
        $this->autoMarkNoShows($clinicId, $branchId);

        $request->validate([
            'date'       => 'required|date',
            'dentist_id' => 'nullable|integer|exists:staff,id',
            'duration'   => 'nullable|integer|min:15|max:180',
        ]);

        $tz       = self::ETHIOPIAN_TZ;
        $now      = Carbon::now($tz);
        $todayEt  = $now->copy()->startOfDay();
        
        // Parse the requested date in Ethiopian timezone
        $date = Carbon::parse($request->date . ' 00:00:00', $tz);
        
        // Compare using date strings
        $requestDateStr = $date->format('Y-m-d');
        $todayStr = $todayEt->format('Y-m-d');
        
        $isToday = ($requestDateStr === $todayStr);
        $isPast = ($requestDateStr < $todayStr);
        $duration = (int) ($request->duration ?? self::SLOT_MINUTES);

        // Get dentists
        $dentistQuery = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->dentists()
            ->available()
            ->with('user');

        if ($request->filled('dentist_id')) {
            $dentistQuery->where('id', $request->dentist_id);
        }

        $dentists = $dentistQuery->get();

        if ($dentists->isEmpty()) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'date'      => $date->toDateString(),
                    'is_past'   => $isPast,
                    'is_closed' => false,
                    'message'   => 'No dentists available',
                    'dentists'  => [],
                ],
            ]);
        }

        // Get appointments for this date (exclude cancelled, include no-show for display)
        $appointments = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->whereDate('appointment_time', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get(['dentist_id', 'appointment_time', 'duration_minutes', 'patient_id', 'status']);

        // Build per-dentist data
        $dentistData = [];

        foreach ($dentists as $staff) {
            $dentistUserId       = $staff->user_id;
            $dentistAppointments = $appointments->where('dentist_id', $dentistUserId)->values();

            $morning   = $staff->getMorningHours();
            $afternoon = $staff->getAfternoonHours();

            // Format booked slots with real-time status
            $bookedSlots = [];
            foreach ($dentistAppointments as $apt) {
                $aptEnd = $apt->appointment_time->copy()->addMinutes($apt->duration_minutes);
                
                // Check if this appointment should be marked as no-show
                $status = $apt->status;
                if ($isToday && $status === 'confirmed') {
                    $noShowTime = $aptEnd->copy()->addMinutes(self::NO_SHOW_GRACE_MINUTES);
                    if ($now->gte($noShowTime)) {
                        $status = 'no_show';
                        // Update in database
                        $apt->update(['status' => 'no_show']);
                    }
                }
                
                $bookedSlots[] = [
                    'time'           => $apt->appointment_time->format('H:i'),
                    'end_time'       => $aptEnd->format('H:i'),
                    'patient_name'   => $apt->patient?->full_name ?? '—',
                    'status'         => $status,
                    'appointment_id' => $apt->id,
                    'duration'       => $apt->duration_minutes,
                ];
            }

            // Handle different date types for free slots
            $freeSlots = [];
            $freeWindows = [];
            $estimatedWait = 0;
            $isClinicClosed = false;
            
            if ($isPast) {
                // PAST DATE: No free slots
                $freeSlots = [];
                $freeWindows = [];
            } elseif ($isToday) {
                // TODAY: Check if clinic is closed for the day (17:00 EAT)
                $endOfDay = Carbon::parse($date->format('Y-m-d') . ' ' . self::DEFAULT_AFTERNOON_END, $tz);
                if ($now->gte($endOfDay)) {
                    // Clinic closed - no free slots
                    $isClinicClosed = true;
                    $freeSlots = [];
                    $freeWindows = [];
                } else {
                    // Calculate free windows for today with real-time filtering
                    $freeWindows = $this->calculateFreeWindowsWithCurrentTime(
                        $date,
                        $morning,
                        $afternoon,
                        $dentistAppointments,
                        $now,
                        $tz
                    );
                    
                    // Convert to free slots for backward compatibility
                    foreach ($freeWindows as $window) {
                        $current = Carbon::parse($date->format('Y-m-d') . ' ' . $window['start'], $tz);
                        $end     = Carbon::parse($date->format('Y-m-d') . ' ' . $window['end'], $tz);
                        while ($current->lt($end)) {
                            $freeSlots[] = $current->format('H:i');
                            $current->addMinutes($duration);
                        }
                    }
                    
                    // Calculate wait time
                    $activeApts = $dentistAppointments->filter(fn($a) =>
                        in_array($a->status, ['confirmed', 'checked_in', 'in_progress', 'treatment_started'])
                    );
                    $estimatedWait = $activeApts->sum('duration_minutes');
                    $inProgress = $dentistAppointments->firstWhere('status', 'in_progress');
                    if ($inProgress && $inProgress->start_time) {
                        $elapsed = $now->diffInMinutes($inProgress->start_time);
                        $estimatedWait = max(0, $estimatedWait - $elapsed);
                    }
                }
            } else {
                // FUTURE DATE: Show all free windows
                $freeWindows = $this->calculateFreeWindows(
                    $date,
                    $morning,
                    $afternoon,
                    $dentistAppointments,
                    $tz
                );
                
                // Convert to free slots
                foreach ($freeWindows as $window) {
                    $current = Carbon::parse($date->format('Y-m-d') . ' ' . $window['start'], $tz);
                    $end     = Carbon::parse($date->format('Y-m-d') . ' ' . $window['end'], $tz);
                    while ($current->lt($end)) {
                        $freeSlots[] = $current->format('H:i');
                        $current->addMinutes($duration);
                    }
                }
                
                // Calculate wait time
                $activeApts = $dentistAppointments->filter(fn($a) =>
                    in_array($a->status, ['confirmed', 'checked_in', 'in_progress', 'treatment_started'])
                );
                $estimatedWait = $activeApts->sum('duration_minutes');
            }

            $dentistData[] = [
                'id'                     => $staff->id,
                'user_id'                => $dentistUserId,
                'name'                   => $staff->name,
                'specialty'              => $staff->specialization ?? 'General Dentistry',
                'estimated_wait_minutes' => (int) round($estimatedWait),
                'booked_slots'           => $bookedSlots,
                'free_slots'             => $freeSlots,
                'free_windows'           => $freeWindows,
                'total_booked'           => $dentistAppointments->count(),
                'total_free'             => count($freeWindows),
                'has_no_appointments'    => ($dentistAppointments->count() === 0 && $isPast),
                'working_hours'          => [
                    'morning'   => $morning,
                    'afternoon' => $afternoon,
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'date'        => $date->toDateString(),
                'is_past'     => $isPast,
                'is_closed'   => ($isToday && isset($isClinicClosed) && $isClinicClosed),
                'current_time'=> $isToday ? $now->format('H:i') : null,
                'dentists'    => $dentistData,
            ],
        ]);
    }

    /**
     * Calculate free windows with real-time current time filtering
     */
    private function calculateFreeWindowsWithCurrentTime(
        Carbon $date,
        array $morning,
        array $afternoon,
        $appointments,
        Carbon $currentTime,
        string $tz = 'Africa/Addis_Ababa'
    ): array {
        // First get all free windows without time filtering
        $allFreeWindows = $this->calculateFreeWindows($date, $morning, $afternoon, $appointments, $tz);
        
        // Then filter based on current time
        $filteredWindows = [];
        foreach ($allFreeWindows as $window) {
            $windowStart = Carbon::parse($date->format('Y-m-d') . ' ' . $window['start'], $tz);
            $windowEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $window['end'], $tz);
            
            // If window end is before current time, skip entirely
            if ($windowEnd->lte($currentTime)) {
                continue;
            }
            
            // If window start is before current time, adjust start to current time
            if ($windowStart->lt($currentTime)) {
                // Round up to next minute
                $adjustedStart = $currentTime->copy();
                $filteredWindows[] = [
                    'start' => $adjustedStart->format('H:i'),
                    'end'   => $window['end']
                ];
            } else {
                $filteredWindows[] = $window;
            }
        }
        
        return $filteredWindows;
    }

    /**
     * Calculate free windows (no current time filtering)
     */
    private function calculateFreeWindows(
        Carbon $date,
        array $morning,
        array $afternoon,
        $appointments,
        string $tz = 'Africa/Addis_Ababa'
    ): array {
        $freeWindows = [];

        // If no appointments, return the full working hours as free windows
        if ($appointments->isEmpty()) {
            if ($morning['enabled']) {
                $freeWindows[] = ['start' => $morning['start'], 'end' => $morning['end']];
            }
            if ($afternoon['enabled']) {
                $freeWindows[] = ['start' => $afternoon['start'], 'end' => $afternoon['end']];
            }
            return $freeWindows;
        }

        // Build busy periods from appointments
        $busyPeriods = [];
        foreach ($appointments as $apt) {
            $start = $apt->appointment_time;
            $end   = $start->copy()->addMinutes($apt->duration_minutes);
            $busyPeriods[] = [
                'start' => $start->format('H:i'),
                'end'   => $end->format('H:i'),
            ];
        }

        // Sort busy periods by start time
        usort($busyPeriods, fn($a, $b) => strcmp($a['start'], $b['start']));

        // Merge overlapping busy periods
        $mergedBusy = [];
        foreach ($busyPeriods as $period) {
            if (empty($mergedBusy)) {
                $mergedBusy[] = $period;
                continue;
            }
            $last = &$mergedBusy[count($mergedBusy) - 1];
            if ($period['start'] <= $last['end']) {
                $last['end'] = max($last['end'], $period['end']);
            } else {
                $mergedBusy[] = $period;
            }
        }

        // Function to calculate free windows within a session
        $calculateSessionWindows = function ($sessionStart, $sessionEnd) use ($mergedBusy) {
            $windows = [];
            $currentPos = $sessionStart;
            
            foreach ($mergedBusy as $busy) {
                if ($busy['start'] >= $sessionEnd) break;
                if ($busy['end'] <= $sessionStart) continue;
                
                $busyStart = max($busy['start'], $sessionStart);
                $busyEnd   = min($busy['end'], $sessionEnd);
                
                if ($currentPos < $busyStart) {
                    $windows[] = ['start' => $currentPos, 'end' => $busyStart];
                }
                $currentPos = $busyEnd;
            }
            
            if ($currentPos < $sessionEnd) {
                $windows[] = ['start' => $currentPos, 'end' => $sessionEnd];
            }
            
            return $windows;
        };

        // Morning session
        if ($morning['enabled']) {
            $morningWindows = $calculateSessionWindows($morning['start'], $morning['end']);
            $freeWindows = array_merge($freeWindows, $morningWindows);
        }

        // Afternoon session
        if ($afternoon['enabled']) {
            $afternoonWindows = $calculateSessionWindows($afternoon['start'], $afternoon['end']);
            $freeWindows = array_merge($freeWindows, $afternoonWindows);
        }

        // Filter out zero-length windows
        $freeWindows = array_filter($freeWindows, fn($w) => $w['start'] < $w['end']);

        return array_values($freeWindows);
    }

    private function format(Appointment $a): array
    {
        return [
            'id'                   => $a->id,
            'patient_id'           => $a->patient_id,
            'patient_name'         => $a->patient ? $a->patient->full_name : '—',
            'dentist_id'           => $a->dentist_id,
            'dentist_name'         => $a->dentist?->name ?? '—',
            'appointment_time'     => $a->appointment_time->toDateTimeString(),
            'appointment_time_raw' => $a->appointment_time->format('Y-m-d\TH:i'),
            'date'                 => $a->appointment_time->toDateString(),
            'time'                 => $a->appointment_time->format('H:i'),
            'duration_minutes'     => $a->duration_minutes,
            'type'                 => $a->type,
            'status'               => $a->status,
            'notes'                => $a->notes,
            'queue_position'       => $a->queue_position,
            'reschedule_count'     => $a->reschedule_count,
            'created_by'           => $a->created_by,
            'is_notified'          => $a->is_notified,
            'branch_id'            => $a->branch_id,
            'clinic_id'            => $a->clinic_id,
        ];
    }
}
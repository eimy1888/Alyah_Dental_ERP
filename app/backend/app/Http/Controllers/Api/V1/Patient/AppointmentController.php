<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\Staff;
use App\Models\Service;
use Carbon\Carbon;

use App\Helpers\EthiopianTime;

class AppointmentController extends Controller
{
    private const DEFAULT_MORNING_START   = '08:30';
    private const DEFAULT_MORNING_END     = '12:00';
    private const DEFAULT_AFTERNOON_START = '13:30';
    private const DEFAULT_AFTERNOON_END   = '17:00';
    private const SLOT_MINUTES            = 30;

    /**
     * Get the patient ID from the logged-in user
     */
    private function getPatientId($user): ?int
    {
        if ($user->role === 'patient') {
            if ($user->patient) {
                return $user->patient->id;
            }
            $patient = Patient::where('user_id', $user->id)->first();
            if ($patient) {
                return $patient->id;
            }
        }
        return null;
    }

    /**
     * Get dentists for patient dropdown
     */
    public function getDentists(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        // Get dentists from staff table with their specializations
        $dentists = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->whereHas('user', function($q) {
                $q->where('role', 'dentist')->where('is_active', true);
            })
            ->with('user:id,name,email')
            ->get();

        $result = $dentists->map(function($staff) {
            return [
                'id' => $staff->user_id,  // Use user_id for consistency with appointments table
                'name' => $staff->user->name,
                'email' => $staff->user->email,
                'specialization' => $staff->specialization ?? 'General Dentistry',
                'is_available' => true,
            ];
        });

        // If no staff records found, fallback to users table
        if ($result->isEmpty()) {
            $users = User::where('clinic_id', $clinicId)
                ->where('role', 'dentist')
                ->where('is_active', true)
                ->get(['id', 'name', 'email']);
            
            $result = $users->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'specialization' => 'General Dentistry',
                    'is_available' => true,
                ];
            });
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get available time slots for a dentist
     */
    public function availability(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'dentist_id' => 'required|integer|exists:users,id',
            'duration' => 'nullable|integer|min:15|max:180',
        ]);

        $date = Carbon::parse($request->date);
        $now = Carbon::now();
        $isToday = $date->isToday();
        $requestedDuration = (int) ($request->duration ?? self::SLOT_MINUTES);
        $dentistUserId = (int) $request->dentist_id;

        // Get staff working hours
        $staff = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('user_id', $dentistUserId)
            ->first();

        $morningHours = $staff ? $staff->getMorningHours() : ['enabled' => false];
        $afternoonHours = $staff ? $staff->getAfternoonHours() : ['enabled' => false];

        $allSlots = [];

        if ($morningHours['enabled']) {
            $allSlots = array_merge($allSlots, $this->generateTimeSlots(
                $morningHours['start'],
                $morningHours['end'],
                self::SLOT_MINUTES
            ));
        }

        if ($afternoonHours['enabled']) {
            $allSlots = array_merge($allSlots, $this->generateTimeSlots(
                $afternoonHours['start'],
                $afternoonHours['end'],
                self::SLOT_MINUTES
            ));
        }

        // Default hours if no working hours defined
        if (empty($allSlots)) {
            $allSlots = array_merge(
                $this->generateTimeSlots(self::DEFAULT_MORNING_START, self::DEFAULT_MORNING_END, self::SLOT_MINUTES),
                $this->generateTimeSlots(self::DEFAULT_AFTERNOON_START, self::DEFAULT_AFTERNOON_END, self::SLOT_MINUTES)
            );
        }

        // Get existing appointments for this dentist on this date
        $existingAppointments = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentistUserId)
            ->whereDate('appointment_time', $date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->get();

        // Filter out booked slots
        $freeSlots = array_values(array_filter($allSlots, function($slot) use ($existingAppointments, $isToday, $now, $requestedDuration) {
            if ($isToday) {
                $slotTime = Carbon::parse($slot . ':00');
                if ($slotTime->lt($now)) {
                    return false;
                }
            }
            return !$this->isSlotOverlapping($slot, $existingAppointments, $requestedDuration);
        }));

        // Add Ethiopian traditional time to each slot
        $freeSlotsWithEtt = array_map(function($slot) {
            return [
                'time'     => $slot,
                'ett_time' => EthiopianTime::toEthiopian(Carbon::parse($slot)),
            ];
        }, $freeSlots);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date->toDateString(),
                'dentists' => [
                    [
                        'id' => $dentistUserId,
                        'name' => User::find($dentistUserId)?->name ?? 'Dentist',
                        'free_slots' => $freeSlotsWithEtt,
                        'total_free' => count($freeSlots),
                        'working_hours' => [
                            'morning' => array_merge($morningHours, [
                                'ett_start' => $morningHours['enabled'] ? EthiopianTime::fromTimeString($morningHours['start']) : null,
                                'ett_end'   => $morningHours['enabled'] ? EthiopianTime::fromTimeString($morningHours['end']) : null,
                            ]),
                            'afternoon' => array_merge($afternoonHours, [
                                'ett_start' => $afternoonHours['enabled'] ? EthiopianTime::fromTimeString($afternoonHours['start']) : null,
                                'ett_end'   => $afternoonHours['enabled'] ? EthiopianTime::fromTimeString($afternoonHours['end']) : null,
                            ]),
                        ],
                    ]
                ],
            ],
        ]);
    }

    /**
     * Create a new appointment request (Patient Portal)
     * Status is set to 'pending' for receptionist approval
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => false,
                'message' => 'Patient record not found. Please contact clinic.',
            ], 404);
        }

        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $request->validate([
            'dentist_id'       => 'required|integer|exists:users,id',
            'appointment_time' => 'required|date|after:now',
            'type'             => 'required|string|max:100',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $dentist = User::where('clinic_id', $clinicId)
            ->where('role', 'dentist')
            ->where('is_active', true)
            ->findOrFail($request->dentist_id);

        // Check for existing active appointment
        $existingAppointment = Appointment::where('patient_id', $patientId)
            ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
            ->exists();

        if ($existingAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an active appointment. Please complete or cancel it before booking another.',
                'code' => 'ACTIVE_APPOINTMENT_EXISTS',
            ], 409);
        }

        // Check if slot is still available
        $appointmentTime = Carbon::parse($request->appointment_time);
        $duration = 30;
        $appointmentEnd = (clone $appointmentTime)->addMinutes($duration);

        $conflictingAppointment = Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->id)
            ->whereDate('appointment_time', $appointmentTime->toDateString())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($query) use ($appointmentTime, $appointmentEnd) {
                $query->where('appointment_time', '<', $appointmentEnd)
                      ->whereRaw("DATE_ADD(appointment_time, INTERVAL duration_minutes MINUTE) > ?", [$appointmentTime]);
            })
            ->exists();

        if ($conflictingAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'This time slot is no longer available. Please select another time.',
                'code' => 'SLOT_UNAVAILABLE',
            ], 409);
        }

        $appointment = Appointment::create([
            'clinic_id'        => $clinicId,
            'branch_id'        => $branchId,
            'patient_id'       => $patientId,
            'dentist_id'       => $dentist->id,
            'appointment_time' => $appointmentTime,
            'duration_minutes' => $duration,
            'type'             => $request->type,
            'notes'            => $request->notes,
            'status'           => 'pending',
            'created_by'       => $user->id,
            'is_notified'      => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Appointment request submitted. Receptionist will confirm shortly.',
            'data'    => [
                'id' => $appointment->id,
                'date' => $appointment->appointment_time->toDateString(),
                'time' => $appointment->appointment_time->format('H:i'),
                'ett_time' => EthiopianTime::toEthiopian($appointment->appointment_time),
                'type' => $appointment->type,
                'status' => $appointment->status,
            ],
        ], 201);
    }

    /**
     * List all appointments for the patient
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => true,
                'data' => [],
                'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => 10],
            ]);
        }

        $query = Appointment::where('patient_id', $patientId)
            ->with(['dentist', 'branch'])
            ->orderBy('appointment_time', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('appointment_time', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('appointment_time', '<=', $request->to_date);
        }

        $appointments = $query->paginate($request->get('per_page', 10));

        return response()->json([
            'success' => true,
            'data' => $appointments->map(fn($a) => [
                'id' => $a->id,
                'date' => $a->appointment_time->toDateString(),
                'time' => $a->appointment_time->format('H:i'),
                'ett_time' => EthiopianTime::toEthiopian($a->appointment_time),
                'dentist_name' => $a->dentist?->name ?? '—',
                'branch_name' => $a->branch?->name ?? '—',
                'type' => $a->type,
                'status' => $a->status,
                'notes' => $a->notes,
                'is_upcoming' => $a->appointment_time->isFuture(),
                'is_past' => $a->appointment_time->isPast(),
            ]),
            'meta' => [
                'total' => $appointments->total(),
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
            ],
        ]);
    }

    /**
     * Show single appointment details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
            ], 404);
        }

        $appointment = Appointment::where('patient_id', $patientId)
            ->where('id', $id)
            ->with(['dentist', 'branch'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $appointment->id,
                'date' => $appointment->appointment_time->toDateString(),
                'time' => $appointment->appointment_time->format('H:i'),
                'ett_time' => EthiopianTime::toEthiopian($appointment->appointment_time),
                'dentist' => [
                    'id' => $appointment->dentist?->id,
                    'name' => $appointment->dentist?->name,
                ],
                'branch' => [
                    'id' => $appointment->branch?->id,
                    'name' => $appointment->branch?->name,
                ],
                'type' => $appointment->type,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
                'duration_minutes' => $appointment->duration_minutes,
            ],
        ]);
    }

    /**
     * Mark an appointment as delayed by the patient
     */
    public function markDelayed(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $patientId = $this->getPatientId($user);

        if (!$patientId) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
            ], 404);
        }

        $request->validate([
            'estimated_arrival_minutes' => 'required|integer|min:1|max:120',
        ]);

        $appointment = Appointment::where('patient_id', $patientId)
            ->where('id', $id)
            ->where('status', 'confirmed')
            ->where('appointment_time', '>', now())
            ->firstOrFail();

        $delayMinutes = (int) $request->estimated_arrival_minutes;
        $newEstimatedArrival = now()->addMinutes($delayMinutes);

        $delayNote = "[PATIENT DELAY] Estimated {$delayMinutes} min delay. New ETA: {$newEstimatedArrival->format('H:i')}";
        $updatedNotes = $appointment->notes
            ? $appointment->notes . "\n" . $delayNote
            : $delayNote;

        $appointment->update([
            'notes' => $updatedNotes,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Delay reported. Estimated arrival in {$delayMinutes} minutes.",
            'data'    => [
                'id'                       => $appointment->id,
                'estimated_delay_minutes'  => $delayMinutes,
                'estimated_arrival_time'   => $newEstimatedArrival->format('H:i'),
            ],
        ]);
    }

    // ── Helper methods ────────────────────────────────────────────────

    private function generateTimeSlots(string $start, string $end, int $slotMinutes): array
    {
        $slots = [];
        $current = Carbon::parse($start);
        $endTime = Carbon::parse($end);

        while ($current->lt($endTime)) {
            $slots[] = $current->format('H:i');
            $current->addMinutes($slotMinutes);
        }

        return $slots;
    }

    private function isSlotOverlapping(string $slotTime, $appointments, int $newDuration = 30): bool
    {
        $slotStart = Carbon::parse($slotTime . ':00');
        $slotEnd = (clone $slotStart)->addMinutes($newDuration);

        foreach ($appointments as $apt) {
            $aptStart = $apt->appointment_time;
            $aptEnd = $aptStart->copy()->addMinutes($apt->duration_minutes ?? 30);

            if ($slotStart->lt($aptEnd) && $slotEnd->gt($aptStart)) {
                return true;
            }
        }

        return false;
    }
}
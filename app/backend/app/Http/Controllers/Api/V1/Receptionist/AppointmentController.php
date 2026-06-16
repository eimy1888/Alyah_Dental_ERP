<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Staff;
use App\Models\User;
use App\Models\Invoice;
use App\Services\AvailabilityService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    // ── Ethiopian timezone — all time logic uses this ──────────────────────────
    private const ETHIOPIAN_TZ = 'Africa/Addis_Ababa';
    
    // ── Working Hours Constants (EAT times - direct storage) ───────────────────
    // Clinic operates 08:30–12:00 and 13:30–17:00 EAT
    private const DEFAULT_MORNING_START   = '08:30';
    private const DEFAULT_MORNING_END     = '12:00';
    private const DEFAULT_AFTERNOON_START = '13:30';
    private const DEFAULT_AFTERNOON_END   = '17:00';
    private const SLOT_MINUTES = 30;
    private const CACHE_TTL    = 300;
    private const NO_SHOW_GRACE_MINUTES = 10;

    protected AvailabilityService $availabilityService;

    public function __construct(AvailabilityService $availabilityService)
    {
        $this->availabilityService = $availabilityService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPOINTMENT TYPES CATALOGUE
    // GET /receptionist/appointment-types?billing_model=treatment
    // Returns the controlled vocabulary — system defaults + clinic customs.
    // billing_model filter: 'service' | 'treatment' | 'hybrid' | all (omit)
    // ─────────────────────────────────────────────────────────────────────────
    public function getAppointmentTypes(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = \App\Models\AppointmentType::forClinic($user->clinic_id)
            ->active()
            ->ordered();

        // Optional filter — e.g. ?billing_model=treatment for treatment picker
        if ($request->filled('billing_model')) {
            $query->where('billing_model', $request->billing_model);
        }

        $types = $query->get()->map(fn($t) => [
            'id'                       => $t->id,
            'name'                     => $t->name,
            'short_code'               => $t->short_code,
            'category'                 => $t->category,
            'default_duration_minutes' => $t->default_duration_minutes,
            'billing_model'            => $t->billing_model,
            'required_specializations' => $t->required_specializations ?? [],
        ]);

        return response()->json([
            'success' => true,
            'data'    => $types,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date'     => 'nullable|date',
            'status'   => 'nullable|string|in:pending,confirmed,checked_in,in_progress,treatment_started,completed,no_show,cancelled',
            'search'   => 'nullable|string|max:100',
            'page'     => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $user = $request->user();
        
        // Auto-mark no-show appointments for today
        $this->autoMarkNoShows($user->clinic_id, $user->branch_id);
        
        $query = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->with([
                'patient' => fn($q) => $q->select('id', 'first_name', 'last_name', 'phone'),
                'dentist' => fn($q) => $q->select('id', 'name'),
            ]);

        $query->when($validated['date'] ?? null,
            fn($q, $date) => $q->whereDate('appointment_time', $date)
        );

        $query->when(
            isset($validated['status']) && $validated['status'] !== 'all',
            fn($q) => $q->where('status', $validated['status'])
        );

        $query->when($validated['search'] ?? null, function ($q, $search) {
            $q->whereHas('patient', function ($sub) use ($search) {
                $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name',  'like', "%{$search}%")
                    ->orWhere('phone',      'like', "%{$search}%");
            });
        });

        $perPage      = (int) ($validated['per_page'] ?? 15);
        $appointments = $query->orderBy('appointment_time', 'asc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $appointments->through(fn($a) => $this->formatAppointmentForList($a)),
            'meta'    => [
                'total'        => $appointments->total(),
                'current_page' => $appointments->currentPage(),
                'last_page'    => $appointments->lastPage(),
                'per_page'     => $appointments->perPage(),
            ],
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
            $noShowTime = $appointmentEnd->copy()->addMinutes(self::NO_SHOW_GRACE_MINUTES);
            
            if ($now->gte($noShowTime)) {
                $appointment->update(['status' => 'no_show']);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE - UPDATED with Clinic Card Check + Notification
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id'          => 'required|exists:patients,id',
            'dentist_id'          => 'required|exists:users,id',
            'appointment_time'    => 'required|date',
            'type'                => 'nullable|string|max:255',
            'notes'               => 'nullable|string|max:1000',
            'duration_minutes'    => 'nullable|integer|min:15|max:180',
            // v2 billing fields
            'service_id'          => 'nullable|exists:services,id',
            'billing_model'       => 'nullable|in:service,treatment,hybrid',
            'appointment_type_id' => 'nullable|exists:appointment_types,id',
            // smart booking fields
            'appointment_kind'    => 'nullable|in:service,treatment,emergency',
            'is_emergency_bypass' => 'nullable|boolean',
        ]);

        $user = $request->user();

        // Emergency bypass skips card check entirely
        $isEmergency = (bool) ($validated['is_emergency_bypass'] ?? false)
            || ($validated['appointment_kind'] ?? '') === 'emergency';

        // ─────────────────────────────────────────────────────────
        // CHECK IF PATIENT HAS ACTIVE CLINIC CARD (skip for emergency)
        // ─────────────────────────────────────────────────────────
        $patient = Patient::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->find($validated['patient_id']);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
                'code'    => 'PATIENT_NOT_FOUND',
            ], 404);
        }

        if (!$isEmergency && !$patient->hasActiveCard()) {
            // Check if there's an unpaid card invoice
            $unpaidCardInvoice = Invoice::forClinic($user->clinic_id)
                ->forBranch($user->branch_id)
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

        return DB::transaction(function () use ($validated, $user) {
            $dentist = User::where('clinic_id', $user->clinic_id)
                ->where('role', 'dentist')
                ->where('is_active', true)
                ->findOrFail($validated['dentist_id']);

            $appointmentTime = Carbon::parse($validated['appointment_time']);
            $duration = isset($validated['duration_minutes'])
                ? (int) $validated['duration_minutes']
                : self::SLOT_MINUTES;

            $staff = Staff::where('user_id', $dentist->id)
                ->where('clinic_id', $user->clinic_id)
                ->where('branch_id', $user->branch_id)
                ->first();

            if ($staff && !$this->availabilityService->isDentistAvailableAt($staff, $appointmentTime, $duration)) {
                return response()->json([
                    'success' => false,
                    'message' => "Dr. {$dentist->name} is not available at this time.",
                    'code'    => 'DENTIST_UNAVAILABLE',
                ], 409);
            }

            $appointmentEnd = $appointmentTime->copy()->addMinutes($duration);
            $hasOverlap = Appointment::forClinic($user->clinic_id)
                ->forBranch($user->branch_id)
                ->where('dentist_id', $dentist->id)
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

            if ($hasOverlap) {
                return response()->json([
                    'success' => false,
                    'message' => "Dr. {$dentist->name} already has an appointment at this time.",
                    'code'    => 'DENTIST_OVERLAP',
                ], 409);
            }

            $patientActive = Appointment::forClinic($user->clinic_id)
                ->forBranch($user->branch_id)
                ->where('patient_id', $validated['patient_id'])
                ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
                ->exists();

            $isEmergencyInner = (bool) ($validated['is_emergency_bypass'] ?? false)
                || ($validated['appointment_kind'] ?? '') === 'emergency';

            // Skip active-appointment check for emergency
            if (!$isEmergencyInner && $patientActive) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient already has an active appointment.',
                    'code'    => 'PATIENT_ACTIVE_APPOINTMENT',
                ], 409);
            }

            $appointment = Appointment::create([
                'clinic_id'           => $user->clinic_id,
                'branch_id'           => $user->branch_id,
                'patient_id'          => $validated['patient_id'],
                'dentist_id'          => $validated['dentist_id'],
                'appointment_time'    => $appointmentTime,
                'duration_minutes'    => $duration,
                'type'                => $validated['type'] ?? 'Consultation',
                'notes'               => $validated['notes'] ?? null,
                'status'              => 'confirmed',
                'created_by'          => $user->id,
                // v2 billing
                'service_id'          => $validated['service_id'] ?? null,
                'billing_model'       => $validated['billing_model'] ?? null,
                'appointment_type_id' => $validated['appointment_type_id'] ?? null,
                // smart booking fields
                'appointment_kind'    => $validated['appointment_kind'] ?? null,
                'is_emergency_bypass' => $isEmergencyInner,
            ]);

            if ($staff) {
                $this->availabilityService->clearCache($staff, $appointmentTime);
            }

            $this->bustAvailabilityCache($user->clinic_id, $user->branch_id, $appointmentTime->toDateString());

            $appointment->load(['patient', 'dentist', 'service']);

            // ── v2: Resolve billing model and create invoices/episodes ──
            app(\App\Services\BillingModelResolver::class)->resolveAtBooking($appointment, $user);
            $appointment->refresh();

            // ── Dispatch notification to branch manager ──
            NotificationService::appointmentBooked($appointment, $user);

            return response()->json([
                'success' => true,
                'message' => 'Appointment booked successfully.',
                'data'    => array_merge(
                    $this->formatAppointmentForList($appointment),
                    ['billing' => $appointment->getBillingSummary()]
                ),
            ], 201);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'patient_id'       => 'sometimes|exists:patients,id',
            'dentist_id'       => 'sometimes|exists:users,id',
            'appointment_time' => 'sometimes|date',
            'type'             => 'nullable|string|max:255',
            'notes'            => 'nullable|string|max:1000',
            'duration_minutes' => 'nullable|integer|min:15|max:180',
            'status'           => ['sometimes', Rule::in([
                'pending','confirmed','checked_in','in_progress','treatment_started','completed','no_show','cancelled',
            ])],
        ]);

        $user = $request->user();

        $appointment = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        if (in_array($appointment->status, ['in_progress', 'treatment_started', 'completed', 'cancelled', 'no_show'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit appointment that is already in progress, completed, cancelled, or no-show.',
            ], 422);
        }

        if (isset($validated['appointment_time']) || isset($validated['duration_minutes'])) {
            $newTime     = isset($validated['appointment_time'])
                ? Carbon::parse($validated['appointment_time'])
                : $appointment->appointment_time;
            $newDuration = isset($validated['duration_minutes'])
                ? (int) $validated['duration_minutes']
                : (int) $appointment->duration_minutes;
            $dentistId   = $validated['dentist_id'] ?? $appointment->dentist_id;

            $staff = Staff::where('user_id', $dentistId)
                ->where('clinic_id', $user->clinic_id)
                ->first();

            if ($staff && !$this->availabilityService->isDentistAvailableAt($staff, $newTime, $newDuration)) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected time slot is not available.',
                ], 409);
            }
        }

        if (isset($validated['duration_minutes'])) {
            $validated['duration_minutes'] = (int) $validated['duration_minutes'];
        }

        $appointment->update(array_filter($validated, fn($v) => $v !== null));

        $this->bustAvailabilityCache(
            $user->clinic_id,
            $user->branch_id,
            $appointment->fresh()->appointment_time->toDateString()
        );

        $appointment->load(['patient', 'dentist']);

        return response()->json([
            'success' => true,
            'message' => 'Appointment updated successfully.',
            'data'    => $this->formatAppointmentForList($appointment),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESTROY (cancel)
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $appointment = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        if (in_array($appointment->status, ['in_progress', 'treatment_started', 'completed', 'cancelled', 'no_show'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel this appointment.',
            ], 422);
        }

        $dateString = $appointment->appointment_time->toDateString();
        $staff = Staff::where('user_id', $appointment->dentist_id)->first();

        $appointment->update(['status' => 'cancelled']);

        if ($staff) {
            $this->availabilityService->clearCache($staff, $appointment->appointment_time);
        }
        $this->bustAvailabilityCache($user->clinic_id, $user->branch_id, $dateString);

        return response()->json([
            'success' => true,
            'message' => 'Appointment cancelled successfully.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE STATUS - with notification when confirmed
    // ─────────────────────────────────────────────────────────────────────────
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([
                'pending', 'confirmed', 'checked_in', 'in_progress',
                'treatment_started', 'completed', 'no_show', 'cancelled',
            ])],
        ]);

        $user = $request->user();

        $appointment = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        $oldStatus = $appointment->status;
        $newStatus = $validated['status'];

        $appointment->update(['status' => $newStatus]);

        if ($newStatus === 'no_show' && $oldStatus !== 'no_show') {
            $patient = $appointment->patient;
            if ($patient) {
                $patient->increment('no_show_count');
                if ($patient->no_show_count >= 3) {
                    $patient->update(['requires_deposit' => true]);
                }
            }
        }

        // ── Send notification to patient when appointment is confirmed ──
        if ($newStatus === 'confirmed' && $oldStatus !== 'confirmed') {
            NotificationService::appointmentConfirmed($appointment);
        }

        $staff = Staff::where('user_id', $appointment->dentist_id)->first();
        if ($staff) {
            $this->availabilityService->clearCache($staff, $appointment->appointment_time);
        }
        $this->bustAvailabilityCache(
            $user->clinic_id,
            $user->branch_id,
            $appointment->appointment_time->toDateString()
        );

        return response()->json([
            'success' => true,
            'message' => 'Appointment status updated.',
            'data'    => $appointment,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK-IN - Only allows if patient has active card
    // ─────────────────────────────────────────────────────────────────────────
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $appointment = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->with(['patient', 'dentist'])
            ->findOrFail($id);

        if ($appointment->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'code'    => 'INVALID_STATUS',
                'message' => "Cannot check in. Appointment status is '{$appointment->status}'. Must be 'confirmed'.",
            ], 422);
        }

        if ($appointment->patient && $appointment->patient->is_blocked) {
            return response()->json([
                'success' => false,
                'code'    => 'PATIENT_BLOCKED',
                'message' => 'Patient is blocked. Cannot check in.',
            ], 422);
        }

        $hasActiveCard = $appointment->patient && $appointment->patient->hasActiveCard();
        
        if (!$hasActiveCard) {
            return response()->json([
                'success' => false,
                'code'    => 'NO_ACTIVE_CARD',
                'message' => 'Patient does not have an active clinic card. Please renew membership before check-in.',
            ], 402);
        }

        $tz              = self::ETHIOPIAN_TZ;
        $appointmentTime = $appointment->appointment_time->setTimezone($tz);
        $nowEt           = Carbon::now($tz);
        $lateMinutes     = max(0, (int) $nowEt->diffInMinutes($appointmentTime, false));
        $isLate          = $lateMinutes > 0;
        $lateCategory    = null;

        if ($isLate) {
            if ($lateMinutes <= 15)     $lateCategory = 'on_time';
            elseif ($lateMinutes <= 30) $lateCategory = 'moderate';
            else                        $lateCategory = 'severe';
        }

        $appointment->update([
            'status'        => 'checked_in',
            'check_in_time' => now(),
            'is_late'       => $isLate,
            'late_minutes'  => $lateMinutes,
        ]);

        $priority     = $lateCategory === 'severe' ? 'late_arrival' : 'scheduled';
        $lastPosition = \App\Models\QueueItem::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->forDentist($appointment->dentist_id)
            ->where('status', 'waiting')
            ->where('priority', $priority)
            ->max('position') ?? 0;

        \App\Models\QueueItem::create([
            'clinic_id'      => $user->clinic_id,
            'branch_id'      => $user->branch_id,
            'appointment_id' => $appointment->id,
            'patient_id'     => $appointment->patient_id,
            'dentist_id'     => $appointment->dentist_id,
            'priority'       => $priority,
            'position'       => $lastPosition + 1,
            'status'         => 'waiting',
            'notes'          => $lateCategory === 'severe'
                ? "Late arrival — {$lateMinutes} min late"
                : null,
        ]);

        $messageParts = ["Patient checked in successfully (Active card verified)"];

        if ($lateCategory === 'severe')       $messageParts[] = "{$lateMinutes} min late — placed at end of queue";
        elseif ($lateCategory === 'moderate') $messageParts[] = "{$lateMinutes} min late — position adjusted";
        elseif ($isLate)                      $messageParts[] = "{$lateMinutes} min late — position kept";

        return response()->json([
            'success' => true,
            'message' => implode('. ', $messageParts) . '.',
            'data'    => [
                'id'              => $appointment->id,
                'status'          => $appointment->status,
                'is_late'         => $isLate,
                'late_minutes'    => $lateMinutes,
                'has_active_card' => $hasActiveCard,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AVAILABILITY - Same as manager's ContinuousGrid
    // ─────────────────────────────────────────────────────────────────────────
    public function availability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date'       => 'required|date',
            'dentist_id' => 'nullable|integer|exists:staff,id',
            'duration'   => 'nullable|integer|min:15|max:180',
        ]);

        $user = $request->user();
        
        $this->autoMarkNoShows($user->clinic_id, $user->branch_id);
        
        $tz       = self::ETHIOPIAN_TZ;
        $now      = Carbon::now($tz);
        $todayEt  = $now->copy()->startOfDay();
        $date     = Carbon::parse($validated['date'] . ' 00:00:00', $tz);
        
        $requestDateStr = $date->format('Y-m-d');
        $todayStr = $todayEt->format('Y-m-d');
        
        $isToday = ($requestDateStr === $todayStr);
        $isPast  = ($requestDateStr < $todayStr);
        $duration = (int) ($validated['duration'] ?? self::SLOT_MINUTES);

        // Past date
        if ($isPast) {
            return $this->getPastDateAvailability($user, $date);
        }

        // Today: check if clinic is closed (17:00 EAT)
        if ($isToday) {
            $endOfDay = Carbon::parse($date->format('Y-m-d') . ' ' . self::DEFAULT_AFTERNOON_END, $tz);
            if ($now->gte($endOfDay)) {
                return response()->json([
                    'success' => true,
                    'data'    => [
                        'date'      => $date->toDateString(),
                        'is_past'   => false,
                        'is_closed' => true,
                        'message'   => 'Clinic is closed for today.',
                        'dentists'  => [],
                    ],
                ]);
            }
        }

        // Get dentists
        $dentistQuery = Staff::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->dentists()
            ->available()
            ->with('user');

        if ($dentistId = $validated['dentist_id'] ?? null) {
            $dentistQuery->where('id', $dentistId);
        }

        $dentists = $dentistQuery->get();

        if ($dentists->isEmpty()) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'date'      => $date->toDateString(),
                    'is_past'   => false,
                    'is_closed' => false,
                    'dentists'  => [],
                ],
            ]);
        }

        // Get appointments
        $cacheKey = sprintf(
            'recept:appointments:clinic:%d:branch:%d:date:%s',
            $user->clinic_id,
            $user->branch_id,
            $date->toDateString()
        );

        $appointments = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user, $date) {
            return Appointment::where('clinic_id', $user->clinic_id)
                ->where('branch_id', $user->branch_id)
                ->whereDate('appointment_time', $date)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->get(['dentist_id', 'appointment_time', 'duration_minutes', 'patient_id', 'status']);
        });

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
                
                $status = $apt->status;
                if ($isToday && $status === 'confirmed') {
                    $noShowTime = $aptEnd->copy()->addMinutes(self::NO_SHOW_GRACE_MINUTES);
                    if ($now->gte($noShowTime)) {
                        $status = 'no_show';
                        $apt->update(['status' => 'no_show']);
                    }
                }
                
                $bookedSlots[] = [
                    'time'           => $apt->appointment_time->format('H:i'),
                    'time_ett'       => \App\Helpers\EthiopianTime::toEthiopian($apt->appointment_time),
                    'end_time'       => $aptEnd->format('H:i'),
                    'patient_name'   => $apt->patient?->full_name ?? '—',
                    'status'         => $status,
                    'appointment_id' => $apt->id,
                    'duration'       => $apt->duration_minutes,
                ];
            }

            // Calculate free windows
            $freeWindows = $this->calculateFreeWindows(
                $date,
                $morning,
                $afternoon,
                $dentistAppointments,
                $tz
            );

            // Filter by current time for today
            if ($isToday) {
                $filteredFreeWindows = [];
                foreach ($freeWindows as $window) {
                    $windowStart = Carbon::parse($date->format('Y-m-d') . ' ' . $window['start'], $tz);
                    if ($windowStart->gte($now)) {
                        $filteredFreeWindows[] = $window;
                    } elseif ($windowStart->lt($now) && Carbon::parse($date->format('Y-m-d') . ' ' . $window['end'], $tz)->gt($now)) {
                        $filteredFreeWindows[] = [
                            'start' => $now->format('H:i'),
                            'end'   => $window['end']
                        ];
                    }
                }
                $freeWindows = $filteredFreeWindows;
            }

            // Convert to free slots
            $freeSlots = [];
            foreach ($freeWindows as $window) {
                $current = Carbon::parse($date->format('Y-m-d') . ' ' . $window['start'], $tz);
                $end     = Carbon::parse($date->format('Y-m-d') . ' ' . $window['end'], $tz);
                while ($current->lt($end)) {
                    $freeSlots[] = $current->format('H:i');
                    $current->addMinutes($duration);
                }
            }

            // Estimated wait
            $activeApts    = $dentistAppointments->filter(fn($a) =>
                in_array($a->status, ['confirmed', 'checked_in', 'in_progress', 'treatment_started'])
            );
            $estimatedWait = $activeApts->sum('duration_minutes');
            $inProgress    = $dentistAppointments->firstWhere('status', 'in_progress');
            if ($inProgress && $inProgress->start_time) {
                $elapsed       = $now->diffInMinutes($inProgress->start_time);
                $estimatedWait = max(0, $estimatedWait - $elapsed);
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
                'date'         => $date->toDateString(),
                'is_past'      => $isPast,
                'is_closed'    => false,
                'current_time' => $isToday ? $now->format('H:i') : null,
                'dentists'     => $dentistData,
            ],
        ]);
    }

    /**
     * Calculate free windows (same as manager)
     */
    private function calculateFreeWindows(
        Carbon $date,
        array $morning,
        array $afternoon,
        $appointments,
        string $tz
    ): array {
        $freeWindows = [];

        if ($appointments->isEmpty()) {
            if ($morning['enabled']) {
                $freeWindows[] = ['start' => $morning['start'], 'end' => $morning['end']];
            }
            if ($afternoon['enabled']) {
                $freeWindows[] = ['start' => $afternoon['start'], 'end' => $afternoon['end']];
            }
            return $freeWindows;
        }

        $busyPeriods = [];
        foreach ($appointments as $apt) {
            $start = $apt->appointment_time;
            $end   = $start->copy()->addMinutes($apt->duration_minutes);
            $busyPeriods[] = [
                'start' => $start->format('H:i'),
                'end'   => $end->format('H:i'),
            ];
        }

        usort($busyPeriods, fn($a, $b) => strcmp($a['start'], $b['start']));

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

        if ($morning['enabled']) {
            $morningWindows = $calculateSessionWindows($morning['start'], $morning['end']);
            $freeWindows = array_merge($freeWindows, $morningWindows);
        }

        if ($afternoon['enabled']) {
            $afternoonWindows = $calculateSessionWindows($afternoon['start'], $afternoon['end']);
            $freeWindows = array_merge($freeWindows, $afternoonWindows);
        }

        $freeWindows = array_filter($freeWindows, fn($w) => $w['start'] < $w['end']);

        return array_values($freeWindows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET DENTISTS
    // ─────────────────────────────────────────────────────────────────────────
    public function getDentists(Request $request): JsonResponse
    {
        $user = $request->user();

        $dentists = Staff::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->dentists()
            ->available()
            ->with('user:id,name')
            ->get()
            ->map(fn($staff) => [
                'id'             => $staff->id,
                'user_id'        => $staff->user_id,
                'name'           => $staff->name,
                'specialization' => $staff->specialization,
            ]);

        return response()->json([
            'success' => true,
            'data'    => $dentists,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function getPastDateAvailability($user, Carbon $date): JsonResponse
    {
        $pastAppointments = Appointment::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->whereDate('appointment_time', $date)
            ->with(['patient' => fn($q) => $q->select('id', 'first_name', 'last_name')])
            ->orderBy('appointment_time')
            ->get();

        $dentistQuery = Staff::where('clinic_id', $user->clinic_id)
            ->where('branch_id', $user->branch_id)
            ->dentists()
            ->available()
            ->with('user');

        $dentists = $dentistQuery->get();
        
        $dentistData = [];
        foreach ($dentists as $staff) {
            $dentistUserId = $staff->user_id;
            $dentistAppointments = Appointment::where('clinic_id', $user->clinic_id)
                ->where('branch_id', $user->branch_id)
                ->where('dentist_id', $dentistUserId)
                ->whereDate('appointment_time', $date)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->get();
            
            $bookedSlots = [];
            foreach ($dentistAppointments as $apt) {
                $aptEnd = $apt->appointment_time->copy()->addMinutes($apt->duration_minutes);
                $bookedSlots[] = [
                    'time'           => $apt->appointment_time->format('H:i'),
                    'end_time'       => $aptEnd->format('H:i'),
                    'patient_name'   => $apt->patient?->full_name ?? '—',
                    'status'         => $apt->status,
                    'appointment_id' => $apt->id,
                    'duration'       => $apt->duration_minutes,
                ];
            }
            
            $dentistData[] = [
                'id'                     => $staff->id,
                'user_id'                => $dentistUserId,
                'name'                   => $staff->name,
                'specialty'              => $staff->specialization ?? 'General Dentistry',
                'estimated_wait_minutes' => 0,
                'booked_slots'           => $bookedSlots,
                'free_slots'             => [],
                'free_windows'           => [],
                'total_booked'           => $dentistAppointments->count(),
                'total_free'             => 0,
                'has_no_appointments'    => ($dentistAppointments->count() === 0),
                'working_hours'          => [
                    'morning'   => $staff->getMorningHours(),
                    'afternoon' => $staff->getAfternoonHours(),
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'date'              => $date->toDateString(),
                'is_past'           => true,
                'is_closed'         => false,
                'message'           => 'Past date - showing only existing appointments',
                'past_appointments' => $pastAppointments->map(fn($a) => [
                    'time'         => $a->appointment_time->format('H:i'),
                    'patient_name' => $a->patient?->full_name ?? '—',
                    'type'         => $a->type,
                    'status'       => $a->status,
                ]),
                'dentists'          => $dentistData,
            ],
        ]);
    }

    private function bustAvailabilityCache(int $clinicId, int $branchId, string $dateStr): void
    {
        Cache::forget(sprintf(
            'recept:appointments:clinic:%d:branch:%d:date:%s',
            $clinicId,
            $branchId,
            $dateStr
        ));
    }

    private function formatAppointmentForList($appointment): array
    {
        return [
            'id'               => $appointment->id,
            'scheduled_at'     => $appointment->appointment_time->format('H:i'),
            'date'             => $appointment->appointment_time->toDateString(),
            'time'             => $appointment->appointment_time->format('H:i'),
            'time_ett'         => \App\Helpers\EthiopianTime::toEthiopian($appointment->appointment_time),
            'time_ett_raw'     => \App\Helpers\EthiopianTime::toEthiopianRaw($appointment->appointment_time),
            'patient'          => [
                'id'        => $appointment->patient?->id,
                'full_name' => $appointment->patient?->full_name ?? '—',
            ],
            'dentist'          => [
                'id'   => $appointment->dentist?->id,
                'name' => $appointment->dentist?->name ?? '—',
            ],
            'type'             => $appointment->type,
            'status'           => $appointment->status,
            'duration_minutes' => (int) $appointment->duration_minutes,
            'notes'            => $appointment->notes,
        ];
    }
}
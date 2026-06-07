<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\QueueItem;
use App\Models\Staff;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReassignmentService
{
    protected AvailabilityService $availabilityService;

    public function __construct(AvailabilityService $availabilityService)
    {
        $this->availabilityService = $availabilityService;
    }

    /**
     * Scenario A: Dentist refers patient to another dentist
     *
     * @param Appointment $appointment
     * @param Staff $fromDentist
     * @param Staff $toDentist
     * @param string $reason
     * @param User $performedBy
     * @return array
     */
    public function referPatient(
        Appointment $appointment,
        Staff $fromDentist,
        Staff $toDentist,
        string $reason,
        User $performedBy
    ): array {
        DB::beginTransaction();

        try {
            // Store original status
            $originalStatus = $appointment->status;
            $wasCheckedIn = $originalStatus === Appointment::STATUS_CHECKED_IN;

            // Update appointment
            $appointment->update([
                'dentist_id' => $toDentist->user_id,
                'notes' => ($appointment->notes ? $appointment->notes . "\n" : '')
                    . "[REFERRAL] From Dr. {$fromDentist->name} to Dr. {$toDentist->name}: {$reason}",
            ]);

            // Push to patient's medical cases
            $appointment->patient->pushMedicalCase(
                "Referred from Dr. {$fromDentist->name} to Dr. {$toDentist->name}: {$reason}",
                'referral'
            );

            // Handle queue item if patient was checked in
            if ($wasCheckedIn && $appointment->queueItem) {
                $queueItem = $appointment->queueItem;
                
                // Remove from old dentist's queue
                $queueItem->delete();
                
                // Add to new dentist's queue
                $lastPosition = QueueItem::where('clinic_id', $appointment->clinic_id)
                    ->where('branch_id', $appointment->branch_id)
                    ->where('dentist_id', $toDentist->user_id)
                    ->where('status', QueueItem::STATUS_WAITING)
                    ->max('position') ?? 0;

                QueueItem::create([
                    'clinic_id' => $appointment->clinic_id,
                    'branch_id' => $appointment->branch_id,
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'dentist_id' => $toDentist->user_id,
                    'priority' => $queueItem->priority,
                    'position' => $lastPosition + 1,
                    'status' => QueueItem::STATUS_WAITING,
                    'notes' => "Referred from Dr. {$fromDentist->name}: {$reason}",
                ]);
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Patient referred to Dr. {$toDentist->name}",
                'appointment' => $appointment,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Patient referral failed', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to refer patient: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Scenario B: Manager reassigns appointments due to dentist unavailable
     *
     * @param Staff $unavailableDentist
     * @param string $reason
     * @param Carbon|null $unavailableUntil
     * @param User $manager
     * @return array
     */
    public function markDentistUnavailable(
        Staff $unavailableDentist,
        string $reason,
        ?Carbon $unavailableUntil,
        User $manager
    ): array {
        DB::beginTransaction();

        try {
            // Mark dentist as unavailable
            $unavailableDentist->markUnavailable($reason, $unavailableUntil);

            // Get affected appointments (today and future, not completed/cancelled/no_show)
            $affectedAppointments = Appointment::where('dentist_id', $unavailableDentist->user_id)
                ->whereDate('appointment_time', '>=', now()->startOfDay())
                ->whereNotIn('status', [
                    Appointment::STATUS_COMPLETED,
                    Appointment::STATUS_CANCELLED,
                    Appointment::STATUS_NO_SHOW,
                ])
                ->with(['patient'])
                ->orderBy('appointment_time')
                ->get();

            DB::commit();

            return [
                'success' => true,
                'message' => "Dr. {$unavailableDentist->name} marked as unavailable",
                'affected_appointments' => $affectedAppointments,
                'count' => $affectedAppointments->count(),
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Mark dentist unavailable failed', [
                'dentist_id' => $unavailableDentist->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to mark dentist unavailable: ' . $e->getMessage(),
                'affected_appointments' => collect(),
                'count' => 0,
            ];
        }
    }

    /**
     * Reassign a single appointment to another dentist
     *
     * @param Appointment $appointment
     * @param Staff $newDentist
     * @param string $reason
     * @param User $manager
     * @return array
     */
    public function reassignAppointment(
        Appointment $appointment,
        Staff $newDentist,
        string $reason,
        User $manager
    ): array {
        DB::beginTransaction();

        try {
            $oldDentistId = $appointment->dentist_id;
            $oldDentist = Staff::where('user_id', $oldDentistId)->first();
            $oldDentistName = $oldDentist?->name ?? 'Unknown';

            // Update appointment
            $appointment->update([
                'dentist_id' => $newDentist->user_id,
                'notes' => ($appointment->notes ? $appointment->notes . "\n" : '')
                    . "[REASSIGNMENT] By {$manager->name}: {$reason} | From Dr. {$oldDentistName} to Dr. {$newDentist->name}",
            ]);

            // Push to patient's medical cases
            $appointment->patient->pushMedicalCase(
                "Reassigned from Dr. {$oldDentistName} to Dr. {$newDentist->name}: {$reason}",
                'reassignment'
            );

            // Handle queue item if appointment was checked in
            if (in_array($appointment->status, [Appointment::STATUS_CHECKED_IN, Appointment::STATUS_IN_PROGRESS]) 
                && $appointment->queueItem) {
                
                $queueItem = $appointment->queueItem;
                
                // Remove from old dentist's queue
                $queueItem->delete();
                
                // Add to new dentist's queue
                $lastPosition = QueueItem::where('clinic_id', $appointment->clinic_id)
                    ->where('branch_id', $appointment->branch_id)
                    ->where('dentist_id', $newDentist->user_id)
                    ->where('status', QueueItem::STATUS_WAITING)
                    ->max('position') ?? 0;

                QueueItem::create([
                    'clinic_id' => $appointment->clinic_id,
                    'branch_id' => $appointment->branch_id,
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'dentist_id' => $newDentist->user_id,
                    'priority' => $queueItem->priority,
                    'position' => $lastPosition + 1,
                    'status' => QueueItem::STATUS_WAITING,
                    'notes' => "Reassigned from Dr. {$oldDentistName}: {$reason}",
                ]);
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Appointment reassigned to Dr. {$newDentist->name}",
                'appointment' => $appointment,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Appointment reassignment failed', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to reassign appointment: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get available dentists for reassignment
     *
     * @param int $clinicId
     * @param int $branchId
     * @param int $excludeDentistUserId
     * @return Collection
     */
    public function getAvailableDentistsForReassignment(int $clinicId, int $branchId, int $excludeDentistUserId): Collection
    {
        return Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('user_id', '!=', $excludeDentistUserId)
            ->available()
            ->dentists()
            ->with('user')
            ->get();
    }

    /**
     * Get upcoming appointments for a dentist
     *
     * @param int $dentistUserId
     * @param int $clinicId
     * @param int $branchId
     * @param int $daysAhead
     * @return Collection
     */
    public function getUpcomingAppointments(int $dentistUserId, int $clinicId, int $branchId, int $daysAhead = 30): Collection
    {
        return Appointment::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentistUserId)
            ->whereDate('appointment_time', '>=', now()->startOfDay())
            ->whereDate('appointment_time', '<=', now()->addDays($daysAhead))
            ->whereNotIn('status', [
                Appointment::STATUS_COMPLETED,
                Appointment::STATUS_CANCELLED,
                Appointment::STATUS_NO_SHOW,
            ])
            ->with(['patient'])
            ->orderBy('appointment_time')
            ->get();
    }
}
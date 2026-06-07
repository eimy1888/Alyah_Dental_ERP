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

class EmergencyService
{
    /**
     * Create an emergency appointment and queue item.
     *
     * Card check logic for emergencies:
     *   - If patient has active card → proceed normally, create treatment invoice
     *   - If patient has NO card → create emergency appointment + flag for billing follow-up
     *     Billing team MUST collect card fee before patient leaves or on next visit
     *   - Emergency is NEVER blocked by missing card — patient safety comes first
     *
     * @param Patient     $patient
     * @param Staff       $dentist
     * @param int         $clinicId
     * @param int         $branchId
     * @param User        $createdBy
     * @param string|null $notes
     * @return array
     */
    public function createEmergencyAppointment(
        Patient $patient,
        Staff $dentist,
        int $clinicId,
        int $branchId,
        User $createdBy,
        ?string $notes = null
    ): array {
        DB::beginTransaction();

        try {
            $hasCard           = $patient->hasActiveCard();
            $cardWarningNote   = '';
            $billingFlag       = false;

            // Card check: emergency proceeds regardless, but flag for billing
            if (!$hasCard) {
                $billingFlag     = true;
                $cardWarningNote = "\n[BILLING FLAG] Patient has no active clinic card. "
                    . "Card fee (ETB " . ($patient->clinic?->getCardPrice() ?? 100) . ") "
                    . "must be collected before patient leaves or on next visit.";
            }

            $fullNotes = ($notes ? "EMERGENCY: {$notes}" : 'EMERGENCY') . $cardWarningNote;

            // Create appointment
            $appointment = Appointment::create([
                'clinic_id'        => $clinicId,
                'branch_id'        => $branchId,
                'patient_id'       => $patient->id,
                'dentist_id'       => $dentist->user_id,
                'appointment_time' => now(),
                'duration_minutes' => 30,
                'type'             => 'Emergency',
                'status'           => Appointment::STATUS_CHECKED_IN,
                'notes'            => $fullNotes,
                'created_by'       => $createdBy->id,
                'check_in_time'    => now(),
                'is_notified'      => false,
                'billing_model'    => Appointment::BILLING_TREATMENT,
            ]);

            // Always create a treatment invoice so billing is never lost
            $invoice = \App\Models\Invoice::createTreatmentInvoice($appointment, $createdBy);
            $appointment->update(['treatment_invoice_id' => $invoice->id]);

            // Open a treatment episode
            $episode = \App\Models\TreatmentEpisode::create([
                'clinic_id'      => $clinicId,
                'branch_id'      => $branchId,
                'appointment_id' => $appointment->id,
                'patient_id'     => $patient->id,
                'dentist_id'     => $dentist->user_id,
                'episode_type'   => \App\Models\TreatmentEpisode::TYPE_TREATMENT,
                'status'         => \App\Models\TreatmentEpisode::STATUS_OPEN,
                'phase_number'   => 1,
                'title'          => 'Emergency Episode',
                'opened_at'      => now(),
                'invoice_id'     => $invoice->id,
            ]);

            // Queue with emergency priority
            $queueItem = $this->addToQueueWithEmergencyPriority($appointment, $dentist, $clinicId, $branchId);

            // If no card — also create a pending card invoice so billing team sees it
            $cardInvoice = null;
            if ($billingFlag) {
                $cardPrice   = $patient->clinic?->getCardPrice() ?? 100;
                $cardInvoice = \App\Models\Invoice::createCardInvoiceForPatient($patient, $createdBy, $cardPrice);
            }

            $patient->pushMedicalCase(
                "Emergency appointment with Dr. {$dentist->name}: " . ($notes ?? 'Urgent care required'),
                'emergency'
            );

            DB::commit();

            $message = 'Emergency appointment created. Patient added to top of queue.';
            if ($billingFlag) {
                $message .= ' ⚠ No active card — card invoice created for collection.';
            }

            return [
                'success'          => true,
                'appointment'      => $appointment,
                'queue_item'       => $queueItem,
                'invoice'          => $invoice,
                'card_invoice'     => $cardInvoice,
                'has_card'         => $hasCard,
                'billing_flag'     => $billingFlag,
                'message'          => $message,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Emergency appointment creation failed', [
                'patient_id' => $patient->id,
                'error'      => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to create emergency appointment: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Add emergency to queue with highest priority (position 1)
     *
     * @param Appointment $appointment
     * @param Staff $dentist
     * @param int $clinicId
     * @param int $branchId
     * @return QueueItem
     */
    private function addToQueueWithEmergencyPriority(
        Appointment $appointment,
        Staff $dentist,
        int $clinicId,
        int $branchId
    ): QueueItem {
        // Shift all existing waiting items down by 1 for this dentist
        QueueItem::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->where('dentist_id', $dentist->user_id)
            ->where('status', QueueItem::STATUS_WAITING)
            ->where('priority', '!=', QueueItem::PRIORITY_EMERGENCY)
            ->increment('position');

        return QueueItem::create([
            'clinic_id' => $clinicId,
            'branch_id' => $branchId,
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'dentist_id' => $dentist->user_id,
            'priority' => QueueItem::PRIORITY_EMERGENCY,
            'position' => 1,
            'status' => QueueItem::STATUS_WAITING,
            'notes' => 'EMERGENCY - Immediate attention required',
        ]);
    }

    /**
     * Check for emergencies waiting longer than threshold and send alerts
     *
     * @param int $clinicId
     * @param int $thresholdMinutes
     * @return Collection
     */
    public function checkWaitingEmergencies(int $clinicId, int $thresholdMinutes = 30): Collection
    {
        $thresholdTime = now()->subMinutes($thresholdMinutes);

        $emergencies = QueueItem::where('clinic_id', $clinicId)
            ->where('priority', QueueItem::PRIORITY_EMERGENCY)
            ->where('status', QueueItem::STATUS_WAITING)
            ->where('created_at', '<=', $thresholdTime)
            ->with(['patient', 'dentist', 'appointment', 'branch'])
            ->get();

        return $emergencies;
    }

    /**
     * Get the fastest available dentist for emergency
     *
     * @param int $clinicId
     * @param int $branchId
     * @return Staff|null
     */
    public function getFastestAvailableDentist(int $clinicId, int $branchId): ?Staff
    {
        // Get all available dentists
        $dentists = Staff::where('clinic_id', $clinicId)
            ->where('branch_id', $branchId)
            ->available()
            ->dentists()
            ->with('user')
            ->get();

        if ($dentists->isEmpty()) {
            return null;
        }

        // Find dentist with shortest queue
        $dentistWithShortestQueue = null;
        $shortestQueueLength = PHP_INT_MAX;

        foreach ($dentists as $dentist) {
            $queueLength = QueueItem::where('dentist_id', $dentist->user_id)
                ->where('status', QueueItem::STATUS_WAITING)
                ->count();

            if ($queueLength < $shortestQueueLength) {
                $shortestQueueLength = $queueLength;
                $dentistWithShortestQueue = $dentist;
            }
        }

        return $dentistWithShortestQueue;
    }

    /**
     * Reassign emergency to another dentist if waiting too long
     *
     * @param QueueItem $queueItem
     * @param Staff $newDentist
     * @param User $manager
     * @return bool
     */
    public function reassignEmergency(QueueItem $queueItem, Staff $newDentist, User $manager): bool
    {
        DB::beginTransaction();

        try {
            // Get current position for new dentist's queue
            $lastPosition = QueueItem::where('clinic_id', $queueItem->clinic_id)
                ->where('branch_id', $queueItem->branch_id)
                ->where('dentist_id', $newDentist->user_id)
                ->where('status', QueueItem::STATUS_WAITING)
                ->max('position') ?? 0;

            // Update queue item with new dentist
            $queueItem->update([
                'dentist_id' => $newDentist->user_id,
                'position' => $lastPosition + 1,
                'notes' => ($queueItem->notes ? $queueItem->notes . "\n" : '') 
                    . "[REASSIGNED] Emergency reassigned by {$manager->name} to Dr. {$newDentist->name}",
            ]);

            // Update appointment
            if ($queueItem->appointment) {
                $queueItem->appointment->update([
                    'dentist_id' => $newDentist->user_id,
                    'notes' => ($queueItem->appointment->notes ? $queueItem->appointment->notes . "\n" : '')
                        . "[REASSIGNED] Emergency reassigned from Dr. #{$queueItem->dentist_id} to Dr. {$newDentist->name}",
                ]);
            }

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Emergency reassignment failed', [
                'queue_item_id' => $queueItem->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
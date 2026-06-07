<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\QueueItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckInService
{
    protected AvailabilityService $availabilityService;
    protected NoShowService $noShowService;

    public function __construct(
        AvailabilityService $availabilityService,
        NoShowService $noShowService
    ) {
        $this->availabilityService = $availabilityService;
        $this->noShowService = $noShowService;
    }

    /**
     * Validate if appointment can be checked in
     *
     * @param Appointment $appointment
     * @param bool $overridePayment
     * @param User|null $manager Optional manager for override tracking
     * @return array ['valid' => bool, 'code' => string|null, 'message' => string|null, 'invoice' => Invoice|null]
     */
    public function validateCheckIn(Appointment $appointment, bool $overridePayment = false, ?User $manager = null): array
    {
        // Validation 1: Status must be 'confirmed'
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return [
                'valid' => false,
                'code' => 'INVALID_STATUS',
                'message' => "Cannot check in. Appointment status is '{$appointment->status}'.",
                'invoice' => null,
            ];
        }

        // Validation 2: Patient blocked
        if ($appointment->patient && $appointment->patient->is_blocked) {
            return [
                'valid' => false,
                'code' => 'PATIENT_BLOCKED',
                'message' => 'Patient is blocked from checking in.',
                'invoice' => null,
            ];
        }

        // Validation 3: Check if appointment is a no-show candidate
        if ($this->noShowService->shouldBeNoShow($appointment)) {
            return [
                'valid' => false,
                'code' => 'NO_SHOW_CANDIDATE',
                'message' => 'Appointment is past due and should be marked as no-show.',
                'invoice' => null,
            ];
        }

        // Validation 4: Payment/Invoice check
        $hasActiveCard = $appointment->patient && $appointment->patient->hasActiveCard();
        $invoice = $appointment->invoice;

        if (!$hasActiveCard && !$overridePayment) {
            // Create invoice if it doesn't exist
            if (!$invoice) {
                $cardPrice = $appointment->clinic->getCardPrice();
                
                $invoice = Invoice::createEmptyForAppointment($appointment, $manager ?? $appointment->createdBy);
                
                // Add card purchase as first item
                $invoice->addProcedure('Clinic Card (Membership)', 1, $cardPrice);
                
                $appointment->load('invoice');
                $invoice = $appointment->invoice;
            }

            // Check if invoice needs payment
            if ($invoice && $invoice->balance > 0) {
                return [
                    'valid' => false,
                    'code' => 'PAYMENT_REQUIRED',
                    'message' => 'Payment required for clinic card before check-in.',
                    'invoice' => $invoice,
                ];
            }
        }

        return [
            'valid' => true,
            'code' => null,
            'message' => null,
            'invoice' => $invoice,
        ];
    }

    /**
     * Process check-in for an appointment
     *
     * @param Appointment $appointment
     * @param bool $overridePayment
     * @param User|null $manager
     * @param string|null $overrideReason
     * @return array
     */
    public function processCheckIn(Appointment $appointment, bool $overridePayment = false, ?User $manager = null, ?string $overrideReason = null): array
    {
        // First validate
        $validation = $this->validateCheckIn($appointment, $overridePayment, $manager);
        if (!$validation['valid']) {
            return $validation;
        }

        DB::beginTransaction();

        try {
            // Calculate late minutes
            $lateMinutes = $appointment->calculateLateMinutes();
            $lateCategory = $appointment->getLateCategory($lateMinutes);
            $isLate = $lateMinutes > 0;

            // Determine queue priority based on lateness
            $priority = $appointment->getQueuePriority($lateMinutes);

            // Create or ensure invoice exists (for non-card patients)
            $invoice = $validation['invoice'];
            if ($appointment->requiresInvoiceOnCheckIn() && !$invoice) {
                $invoice = $appointment->getOrCreateInvoice();
            }

            // Update appointment
            $updateData = [
                'status' => Appointment::STATUS_CHECKED_IN,
                'check_in_time' => now(),
                'is_late' => $isLate,
                'late_minutes' => max(0, $lateMinutes),
            ];

            $appointment->update($updateData);

            // Log override if used
            if ($overridePayment && $manager) {
                $overrideNote = "[OVERRIDE] Payment requirement waived by {$manager->name} (ID: {$manager->id})";
                if ($overrideReason) {
                    $overrideNote .= " — {$overrideReason}";
                }
                $appointment->update([
                    'notes' => $appointment->notes 
                        ? $appointment->notes . "\n" . $overrideNote 
                        : $overrideNote,
                ]);
            }

            // Create queue item
            $lastPosition = QueueItem::where('clinic_id', $appointment->clinic_id)
                ->where('branch_id', $appointment->branch_id)
                ->where('dentist_id', $appointment->dentist_id)
                ->where('status', QueueItem::STATUS_WAITING)
                ->where('priority', $priority)
                ->max('position') ?? 0;

            $queueNotes = null;
            if ($lateCategory === 'severe') {
                $queueNotes = "Late arrival — {$lateMinutes} min late";
            } elseif ($lateCategory === 'moderate') {
                $queueNotes = "Moderate delay — {$lateMinutes} min late";
            }

            $queueItem = QueueItem::create([
                'clinic_id' => $appointment->clinic_id,
                'branch_id' => $appointment->branch_id,
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'dentist_id' => $appointment->dentist_id,
                'priority' => $priority,
                'position' => $lastPosition + 1,
                'status' => QueueItem::STATUS_WAITING,
                'notes' => $queueNotes,
            ]);

            DB::commit();

            // Build response message
            $messageParts = [];
            if ($overridePayment) {
                $messageParts[] = 'Patient checked in (payment overridden)';
            } else {
                $messageParts[] = 'Patient checked in successfully';
            }

            if ($lateCategory === 'severe') {
                $messageParts[] = "{$lateMinutes} min late — placed at end of queue";
            } elseif ($lateCategory === 'moderate') {
                $messageParts[] = "{$lateMinutes} min late — position adjusted";
            } elseif ($isLate) {
                $messageParts[] = "{$lateMinutes} min late — position kept";
            }

            return [
                'valid' => true,
                'code' => null,
                'message' => implode('. ', $messageParts) . '.',
                'invoice' => $invoice,
                'queue_item' => $queueItem,
                'late_minutes' => $lateMinutes,
                'late_category' => $lateCategory,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Check-in failed', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'valid' => false,
                'code' => 'PROCESSING_ERROR',
                'message' => 'Failed to process check-in: ' . $e->getMessage(),
                'invoice' => null,
            ];
        }
    }

    /**
     * Get check-in status for an appointment
     *
     * @param Appointment $appointment
     * @return array
     */
    public function getCheckInStatus(Appointment $appointment): array
    {
        return [
            'is_checked_in' => $appointment->status === Appointment::STATUS_CHECKED_IN,
            'check_in_time' => $appointment->check_in_time?->toDateTimeString(),
            'is_late' => $appointment->is_late,
            'late_minutes' => $appointment->late_minutes,
            'has_queue_item' => $appointment->queueItem !== null,
            'queue_position' => $appointment->queueItem?->position,
            'requires_payment' => $appointment->requiresInvoiceOnCheckIn(),
            'has_paid_invoice' => $appointment->invoice && $appointment->invoice->balance <= 0,
        ];
    }
}
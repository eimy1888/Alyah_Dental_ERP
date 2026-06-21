<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\LabOrder;
use App\Models\Prescription;
use App\Models\InventoryItem;
use App\Models\QueueItem;
use App\Models\Recall;
use App\Models\Subscription;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Notifications\AppointmentBookedNotification;
use App\Notifications\AppointmentConfirmedNotification;
use App\Notifications\EmergencyWaitingAlertNotification;
use App\Notifications\InvoiceCreatedNotification;
use App\Notifications\InvoicePaidNotification;
use App\Notifications\InvoiceReadyForReviewNotification;
use App\Notifications\LabOrderCreatedNotification;
use App\Notifications\LabOrderReadyNotification;
use App\Notifications\PatientCheckedInNotification;
use App\Notifications\RecallDueNotification;
use App\Notifications\SubscriptionExpiredNotification;
use App\Notifications\SubscriptionExpiringNotification;
use App\Notifications\SubscriptionRenewedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Central notification hub — all methods are static, all wrapped in try/catch.
 * A notification failure must NEVER break the main business flow.
 */
class NotificationService
{
    // ── Appointment notifications ─────────────────────────────────────────────

    public static function appointmentBooked(Appointment $appointment, User $bookedBy): void
    {
        try {
            $appointment->loadMissing(['patient', 'dentist']);
            $notification = new AppointmentBookedNotification($appointment, $bookedBy->name, $bookedBy->role);

            User::where('clinic_id', $appointment->clinic_id)
                ->where('branch_id', $appointment->branch_id)
                ->where('role', 'branch_manager')
                ->where('is_active', true)
                ->get()
                ->each(fn($m) => $m->notify($notification));
        } catch (\Throwable $e) {
            Log::error('[NS] appointmentBooked: ' . $e->getMessage());
        }
    }

    public static function appointmentConfirmed(Appointment $appointment): void
    {
        try {
            $appointment->loadMissing(['patient', 'dentist']);
            $patientUser = self::findPatientUser($appointment);
            if ($patientUser) {
                $patientUser->notify(new AppointmentConfirmedNotification($appointment));
            }
        } catch (\Throwable $e) {
            Log::error('[NS] appointmentConfirmed: ' . $e->getMessage());
        }
    }

    public static function patientCheckedIn(Appointment $appointment, int $queuePosition): void
    {
        try {
            if ($appointment->is_notified) {
                return;
            }

            $dentist = User::find($appointment->dentist_id);
            if ($dentist) {
                $dentist->notify(new PatientCheckedInNotification($appointment, $queuePosition));
            }

            $appointment->update(['is_notified' => true]);
        } catch (\Throwable $e) {
            Log::error('[NS] patientCheckedIn: ' . $e->getMessage());
        }
    }

    // ── Invoice / Billing notifications ──────────────────────────────────────

    public static function invoiceCreated(Invoice $invoice, User $createdBy): void
    {
        try {
            $invoice->loadMissing(['patient']);
            $notification = new InvoiceCreatedNotification($invoice, $createdBy->name);

            // Notify all active accountants
            User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get()
                ->each(fn($a) => $a->notify($notification));

            // Notify patient if portal account exists
            $patientUser = self::findPatientByInvoice($invoice);
            if ($patientUser) {
                $patientUser->notify($notification);
            }
        } catch (\Throwable $e) {
            Log::error('[NS] invoiceCreated: ' . $e->getMessage());
        }
    }

    public static function invoiceReadyForPayment(Invoice $invoice, string $dentistName): void
    {
        try {
            $invoice->loadMissing(['patient']);
            $notification = new InvoiceReadyForReviewNotification($invoice, $dentistName);

            // Notify all accountants
            User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get()
                ->each(fn($a) => $a->notify($notification));

            // Notify receptionists
            User::where('clinic_id', $invoice->clinic_id)
                ->where('role', 'receptionist')
                ->where('is_active', true)
                ->get()
                ->each(fn($r) => $r->notify($notification));

            // Notify patient
            $patientUser = self::findPatientByInvoice($invoice);
            if ($patientUser) {
                $patientUser->notify($notification);
            }
        } catch (\Throwable $e) {
            Log::error('[NS] invoiceReadyForPayment: ' . $e->getMessage());
        }
    }

    public static function invoicePaid(Invoice $invoice): void
    {
        try {
            $invoice->loadMissing(['patient', 'clinic']);

            // Notify patient by DB + email
            $patientUser = self::findPatientByInvoice($invoice);
            if ($patientUser) {
                $patientUser->notify(new InvoicePaidNotification($invoice));

                // Send payment confirmation email
                if ($patientUser->email) {
                    Mail::to($patientUser->email)
                        ->queue(new \App\Mail\InvoicePaidMail($invoice));
                }
            }

            // Notify dentist (treatment is active)
            $appointment = $invoice->appointment;
            if ($appointment) {
                $dentist = User::find($appointment->dentist_id);
                if ($dentist) {
                    $dentist->notify(new InvoicePaidNotification($invoice));
                }
            }
        } catch (\Throwable $e) {
            Log::error('[NS] invoicePaid: ' . $e->getMessage());
        }
    }

    public static function prescriptionIssued(Prescription $prescription): void
    {
        try {
            $prescription->loadMissing(['patient', 'dentist', 'items']);
            $patient = $prescription->patient;
            if (!$patient) {
                return;
            }

            $patientUser = $patient->user_id
                ? User::find($patient->user_id)
                : User::where('clinic_id', $prescription->clinic_id)
                    ->where('role', 'patient')
                    ->where(function ($q) use ($patient) {
                        if ($patient->email) $q->orWhere('email', $patient->email);
                        if ($patient->phone) $q->orWhere('phone', $patient->phone);
                    })->first();

            if (!$patientUser) {
                return;
            }

            \DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'prescription_issued',
                'notifiable_type' => User::class,
                'notifiable_id' => $patientUser->id,
                'data' => json_encode([
                    'title' => 'Prescription issued',
                    'message' => 'A new prescription has been added to your portal.',
                    'prescription_id' => $prescription->id,
                    'dentist' => $prescription->dentist?->name,
                    'items' => $prescription->items->pluck('drug_name')->values(),
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[NS] prescriptionIssued: ' . $e->getMessage());
        }
    }

    public static function inventoryLowStock(InventoryItem $item): void
    {
        try {
            User::where('clinic_id', $item->clinic_id)
                ->whereIn('role', ['clinic_admin', 'branch_manager'])
                ->where('is_active', true)
                ->when($item->branch_id, fn($q) => $q->where(function ($sq) use ($item) {
                    $sq->whereNull('branch_id')->orWhere('branch_id', $item->branch_id);
                }))
                ->get()
                ->each(function (User $user) use ($item) {
                    \DB::table('notifications')->insert([
                        'id' => (string) Str::uuid(),
                        'type' => 'inventory_low_stock',
                        'notifiable_type' => User::class,
                        'notifiable_id' => $user->id,
                        'data' => json_encode([
                            'title' => 'Inventory low stock',
                            'message' => "{$item->name} is at {$item->current_quantity}, reorder threshold {$item->reorder_threshold}.",
                            'inventory_item_id' => $item->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
        } catch (\Throwable $e) {
            Log::error('[NS] inventoryLowStock: ' . $e->getMessage());
        }
    }

    // ── Treatment Plan notifications ──────────────────────────────────────────

    public static function treatmentPlanCreated(TreatmentPlan $plan, Appointment $appointment, User $gp): void
    {
        try {
            $plan->loadMissing(['patient']);
            $invoice     = $plan->invoice;
            $patientName = $plan->patient?->full_name ?? 'Patient';
            $total       = number_format((float) ($invoice?->total ?? 0), 2);
            $invoiceNum  = $invoice?->invoice_number ?? '—';

            // Notify accountants
            User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'accountant')
                ->where('is_active', true)
                ->get()
                ->each(function ($acc) use ($plan, $invoice, $patientName, $total, $gp, $invoiceNum) {
                    \DB::table('notifications')->insert([
                        'id'              => \Illuminate\Support\Str::uuid(),
                        'type'            => 'invoice_ready_for_payment',
                        'notifiable_type' => User::class,
                        'notifiable_id'   => $acc->id,
                        'data'            => json_encode([
                            'title'      => 'Invoice Ready — Collect Payment',
                            'message'    => "Invoice {$invoiceNum} for {$patientName}. Total: ETB {$total}. Collect now.",
                            'invoice_id' => $invoice?->id,
                            'plan_id'    => $plan->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            // Notify receptionists
            User::where('clinic_id', $plan->clinic_id)
                ->where('role', 'receptionist')
                ->where('is_active', true)
                ->get()
                ->each(function ($rec) use ($patientName, $total, $invoice, $invoiceNum) {
                    \DB::table('notifications')->insert([
                        'id'              => \Illuminate\Support\Str::uuid(),
                        'type'            => 'invoice_ready_for_payment',
                        'notifiable_type' => User::class,
                        'notifiable_id'   => $rec->id,
                        'data'            => json_encode([
                            'title'      => "PAYMENT REQUIRED — ETB {$total}",
                            'message'    => "{$patientName} — Invoice {$invoiceNum} — ETB {$total}",
                            'invoice_id' => $invoice?->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            // Notify patient
            $patientUser = self::findPatientUserByPlan($plan);
            if ($patientUser) {
                \DB::table('notifications')->insert([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'treatment_plan_ready',
                    'notifiable_type' => User::class,
                    'notifiable_id'   => $patientUser->id,
                    'data'            => json_encode([
                        'title'      => 'Your Treatment Plan is Ready',
                        'message'    => "Dr. {$gp->name} has prepared your treatment plan. Please proceed to the payment desk. Total: ETB {$total}.",
                        'invoice_id' => $invoice?->id,
                        'plan_id'    => $plan->id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[NS] treatmentPlanCreated: ' . $e->getMessage());
        }
    }

    // ── Lab Order notifications ───────────────────────────────────────────────

    public static function labOrderCreated(LabOrder $labOrder): void
    {
        try {
            $labOrder->loadMissing(['patient', 'orderingDentist']);

            // Notify all lab technicians in this branch
            User::where('clinic_id', $labOrder->clinic_id)
                ->where('branch_id', $labOrder->branch_id)
                ->where('role', 'lab_technician')
                ->where('is_active', true)
                ->get()
                ->each(fn($lt) => $lt->notify(new LabOrderCreatedNotification($labOrder)));
        } catch (\Throwable $e) {
            Log::error('[NS] labOrderCreated: ' . $e->getMessage());
        }
    }

    public static function labOrderReady(LabOrder $labOrder): void
    {
        try {
            $labOrder->loadMissing(['patient', 'orderingDentist']);

            // Notify ordering dentist
            $dentist = User::find($labOrder->ordering_dentist_id);
            if ($dentist) {
                $dentist->notify(new LabOrderReadyNotification($labOrder));
            }

            // Notify fitting specialist if set
            if ($labOrder->fitting_specialist_id) {
                $specialist = User::find($labOrder->fitting_specialist_id);
                if ($specialist) {
                    $specialist->notify(new LabOrderReadyNotification($labOrder));
                }
            }
        } catch (\Throwable $e) {
            Log::error('[NS] labOrderReady: ' . $e->getMessage());
        }
    }

    // ── Emergency notifications ───────────────────────────────────────────────

    public static function emergencyWaitingTooLong(QueueItem $queueItem, int $waitingMinutes, int $thresholdMinutes): void
    {
        try {
            // Notify all branch managers
            User::where('clinic_id', $queueItem->clinic_id)
                ->where('branch_id', $queueItem->branch_id)
                ->where('role', 'branch_manager')
                ->where('is_active', true)
                ->get()
                ->each(fn($m) => $m->notify(
                    new EmergencyWaitingAlertNotification($queueItem, $waitingMinutes, $thresholdMinutes)
                ));
        } catch (\Throwable $e) {
            Log::error('[NS] emergencyWaitingTooLong: ' . $e->getMessage());
        }
    }

    // ── Subscription notifications ────────────────────────────────────────────

    public static function subscriptionExpiring(Subscription $subscription, int $daysRemaining): void
    {
        try {
            $admin = User::where('clinic_id', $subscription->clinic_id)
                ->where('role', 'clinic_admin')
                ->where('is_active', true)
                ->first();

            if (!$admin) return;

            $subscription->loadMissing(['clinic', 'plan']);
            $clinic = $subscription->clinic;

            // DB notification
            $admin->notify(new SubscriptionExpiringNotification($subscription, $daysRemaining));

            // Email
            if ($admin->email) {
                Mail::to($admin->email)->queue(
                    new \App\Mail\SubscriptionExpiringMail($clinic, $admin, $subscription, $daysRemaining)
                );
            }
        } catch (\Throwable $e) {
            Log::error('[NS] subscriptionExpiring: ' . $e->getMessage());
        }
    }

    public static function subscriptionExpired(Subscription $subscription): void
    {
        try {
            $admin = User::where('clinic_id', $subscription->clinic_id)
                ->where('role', 'clinic_admin')
                ->first(); // even if is_active = false (already suspended)

            if (!$admin) return;

            $subscription->loadMissing(['clinic', 'plan']);
            $clinic = $subscription->clinic;

            $admin->notify(new SubscriptionExpiredNotification($subscription));

            if ($admin->email) {
                Mail::to($admin->email)->queue(
                    new \App\Mail\SubscriptionExpiredMail($clinic, $admin, $subscription)
                );
            }
        } catch (\Throwable $e) {
            Log::error('[NS] subscriptionExpired: ' . $e->getMessage());
        }
    }

    public static function subscriptionRenewed(Subscription $subscription): void
    {
        try {
            $admin = User::where('clinic_id', $subscription->clinic_id)
                ->where('role', 'clinic_admin')
                ->where('is_active', true)
                ->first();

            if ($admin) {
                $admin->notify(new SubscriptionRenewedNotification($subscription));
            }
        } catch (\Throwable $e) {
            Log::error('[NS] subscriptionRenewed: ' . $e->getMessage());
        }
    }

    // ── Recall notifications ──────────────────────────────────────────────────

    public static function recallDue(Recall $recall): void
    {
        try {
            $recall->loadMissing(['patient', 'dentist']);

            // DB notification to dentist
            $dentist = User::find($recall->dentist_id);
            if ($dentist) {
                $dentist->notify(new RecallDueNotification($recall));
            }

            // Email + DB notification to patient portal user
            $patient = $recall->patient;
            if ($patient) {
                $patientUser = $patient->user_id
                    ? User::find($patient->user_id)
                    : User::where('clinic_id', $recall->clinic_id)
                        ->where('role', 'patient')
                        ->where(function ($q) use ($patient) {
                            if ($patient->email) $q->orWhere('email', $patient->email);
                            if ($patient->phone) $q->orWhere('phone', $patient->phone);
                        })->first();

                if ($patientUser) {
                    $patientUser->notify(new RecallDueNotification($recall));
                }

                // Send email to patient's email address
                $emailAddress = $patient->email ?? $patientUser?->email;
                if ($emailAddress) {
                    Mail::to($emailAddress)->queue(new \App\Mail\RecallReminderMail($recall));
                }
            }
        } catch (\Throwable $e) {
            Log::error('[NS] recallDue: ' . $e->getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static function findPatientUser(Appointment $appointment): ?User
    {
        $patient = $appointment->patient;
        if (!$patient) return null;
        if ($patient->user_id) return User::find($patient->user_id);

        return User::where('clinic_id', $appointment->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })->first();
    }

    private static function findPatientByInvoice(Invoice $invoice): ?User
    {
        $patient = $invoice->patient;
        if (!$patient) return null;
        if ($patient->user_id) return User::find($patient->user_id);

        return User::where('clinic_id', $invoice->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })->first();
    }

    private static function findPatientUserByPlan(TreatmentPlan $plan): ?User
    {
        $patient = $plan->patient;
        if (!$patient) return null;
        if ($patient->user_id) return User::find($patient->user_id);

        return User::where('clinic_id', $plan->clinic_id)
            ->where('role', 'patient')
            ->where(function ($q) use ($patient) {
                if ($patient->email) $q->orWhere('email', $patient->email);
                if ($patient->phone) $q->orWhere('phone', $patient->phone);
            })->first();
    }
}

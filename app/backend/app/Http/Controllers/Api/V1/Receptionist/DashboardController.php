<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Invoice;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchId = $user->branch_id;
        $clinicId = $user->clinic_id;

        $today = Carbon::today();

        // ── KPIs ─────────────────────────────────────────────────────────────
        $patientsCount = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->count();

        $appointmentsToday = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereDate('appointment_time', $today)
            ->count();

        $checkedInCount = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereDate('appointment_time', $today)
            ->where('status', 'checked_in')
            ->count();

        $waitlistCount = 0;

        // invoicesToday — count only released invoices (not DRAFT)
        $invoicesToday = Invoice::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->whereDate('created_at', $today)
            ->count();

        // ── Live Queue ────────────────────────────────────────────────────────
        $liveQueue = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereDate('appointment_time', $today)
            ->where('status', 'checked_in')
            ->with(['patient', 'dentist'])
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a, $index) => [
                'patient_name' => $a->patient?->full_name ?? '—',
                'dentist_name' => $a->dentist?->name ?? '—',
                'chair'        => $index + 1,
                'wait_time'    => $a->appointment_time->diffInMinutes(now()) . ' min',
            ]);

        // ── Today's Appointments ──────────────────────────────────────────────
        $todayAppointments = Appointment::forClinic($clinicId)
            ->forBranch($branchId)
            ->whereDate('appointment_time', $today)
            ->with(['patient', 'dentist'])
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'time'         => $a->appointment_time->format('H:i'),
                'patient_name' => $a->patient?->full_name ?? '—',
                'type'         => $a->type ?? 'Consultation',
                'status'       => $a->status,
            ]);

        // ── Recent Invoices — excludes DRAFT ─────────────────────────────────
        $recentInvoices = Invoice::forClinic($clinicId)
            ->forBranch($branchId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->with('patient')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($i) => [
                'id'             => $i->id,
                'invoice_number' => $i->invoice_number,
                'patient_name'   => $i->patient?->full_name ?? '—',
                'total'          => $i->total,
                'balance'        => $i->balance,
                'status'         => $i->status,
            ]);

        // ── Patient Quick View ────────────────────────────────────────────────
        $patientQuickView = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->with(['appointments' => function ($q) use ($today) {
                $q->whereDate('appointment_time', '>=', $today)
                  ->orderBy('appointment_time')
                  ->limit(1);
            }])
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id'               => $p->id,
                'name'             => $p->full_name,
                'next_appointment' => $p->appointments->first()?->appointment_time->format('H:i') ?? 'No upcoming',
                'balance'          => $p->invoices()->whereIn('status', ['partial', 'sent'])->sum('balance'),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'patients_count'         => $patientsCount,
                'appointments_today'     => $appointmentsToday,
                'checked_in_count'       => $checkedInCount,
                'waitlist_count'         => $waitlistCount,
                'invoices_printed_today' => $invoicesToday,
                'unread_messages_count'  => 0,
                'live_queue'             => $liveQueue,
                'today_appointments'     => $todayAppointments,
                'recent_invoices'        => $recentInvoices,
                'patient_quick_view'     => $patientQuickView,
            ],
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    private function clinicId(): int
    {
        return auth()->user()->clinic_id;
    }

    /**
     * GET /api/v1/admin/dashboard
     */
    public function index(): JsonResponse
    {
        $clinicId   = $this->clinicId();
        $today      = now()->format('Y-m-d');
        $monthStart = now()->startOfMonth()->toDateTimeString();
        $monthEnd   = now()->endOfMonth()->toDateTimeString();

        // ── Today's appointments ──────────────────────────────────────────────
        $todayAppointments = Appointment::where('clinic_id', $clinicId)
            ->whereDate('appointment_time', $today)
            ->count();

        $pendingAppointments = Appointment::where('clinic_id', $clinicId)
            ->whereDate('appointment_time', $today)
            ->where('status', 'pending')
            ->count();

        // ── MTD Revenue ───────────────────────────────────────────────────────
        $mtdRevenue = Payment::where('clinic_id', $clinicId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->sum('amount');

        // ── Patients ──────────────────────────────────────────────────────────
        $activePatients = Patient::where('clinic_id', $clinicId)
            ->count();

        $newPatientsThisWeek = Patient::where('clinic_id', $clinicId)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        // ── Low stock ─────────────────────────────────────────────────────────
        $lowStockCount = InventoryItem::where('clinic_id', $clinicId)
            ->whereColumn('current_quantity', '<', 'reorder_threshold')
            ->count();

        $criticalStockCount = InventoryItem::where('clinic_id', $clinicId)
            ->where('current_quantity', '<=', 0)
            ->count();

        // ── Appointment trend (last 7 days) ───────────────────────────────────
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date    = now()->subDays($i);
            $count   = Appointment::where('clinic_id', $clinicId)
                ->whereDate('appointment_time', $date->format('Y-m-d'))
                ->count();
            $trend[] = [
                'day'   => $date->format('D'),
                'date'  => $date->format('Y-m-d'),
                'count' => $count,
            ];
        }

        // ── Financial exposure — excludes DRAFT (unreleased invoices) ──────────
        $financialExposure = Invoice::where('clinic_id', $clinicId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->with('patient:id,first_name,last_name')
            ->orderByDesc('balance')
            ->limit(5)
            ->get()
            ->map(function ($inv) {
                $balance = (float) ($inv->balance ?? 0);
                $risk    = match (true) {
                    $balance > 5000 => 'high',
                    $balance > 2000 => 'medium',
                    default         => 'low',
                };
                return [
                    'invoice_id'     => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'patient'        => $inv->patient
                        ? trim($inv->patient->first_name . ' ' . $inv->patient->last_name)
                        : '—',
                    'outstanding'    => $balance,
                    'status'         => $inv->status,
                    'risk'           => $risk,
                ];
            });

        // ── Recent invoices — excludes DRAFT ─────────────────────────────────
        $recentInvoices = Invoice::where('clinic_id', $clinicId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->with(['patient:id,first_name,last_name', 'branch:id,name'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number ?? '—',
                'patient'        => $inv->patient
                    ? trim($inv->patient->first_name . ' ' . $inv->patient->last_name)
                    : '—',
                'branch'         => $inv->branch?->name ?? '—',
                'amount'         => (float) ($inv->total ?? 0),
                'status'         => $inv->status,
            ]);

        // ── Low stock items for alert strip ───────────────────────────────────
        $lowStockItems = InventoryItem::where('clinic_id', $clinicId)
            ->whereColumn('current_quantity', '<', 'reorder_threshold')
            ->orderBy('current_quantity')
            ->limit(3)
            ->get(['name', 'current_quantity', 'reorder_threshold']);

        // ── Outstanding + overdue — excludes DRAFT ───────────────────────────
        $outstanding = Invoice::where('clinic_id', $clinicId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->sum('balance');

        $overdueCount = Invoice::where('clinic_id', $clinicId)
            ->where('lifecycle_status', '!=', Invoice::STATUS_DRAFT)
            ->where('status', 'overdue')
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'metrics' => [
                    'today_appointments'   => $todayAppointments,
                    'pending_appointments' => $pendingAppointments,
                    'mtd_revenue'          => (float) $mtdRevenue,
                    'active_patients'      => $activePatients,
                    'new_patients_week'    => $newPatientsThisWeek,
                    'low_stock_count'      => $lowStockCount,
                    'critical_stock_count' => $criticalStockCount,
                    'outstanding_ar'       => (float) $outstanding,
                    'overdue_invoices'     => $overdueCount,
                ],
                'appointment_trend'  => $trend,
                'financial_exposure' => $financialExposure,
                'recent_invoices'    => $recentInvoices,
                'low_stock_items'    => $lowStockItems,
            ],
        ]);
    }
}
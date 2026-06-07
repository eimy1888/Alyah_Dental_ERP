<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\InventoryItem;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    private function clinicId(): int
    {
        return auth()->user()->clinic_id;
    }

    /**
     * GET /api/v1/clinic/reports
     * List all available reports with their last-run metadata.
     */
    public function index(): JsonResponse
    {
        $clinicId = $this->clinicId();

        // Compute live stats for each report
        $now       = now();
        $monthStart= $now->copy()->startOfMonth()->format('Y-m-d');
        $monthEnd  = $now->copy()->endOfMonth()->format('Y-m-d');

        $reports = [
            [
                'id'             => 1,
                'name'           => 'Revenue Performance',
                'scope'          => 'Clinic-wide',
                'owner'          => 'Finance',
                'format'         => 'PDF, XLSX',
                'description'    => 'Monthly and YTD revenue breakdown by branch, payer, and service category.',
                'last_generated' => $now->format('d M Y H:i'),
                'status'         => 'ready',
                'meta'           => [
                    'mtd_revenue' => (float) Payment::forClinic($clinicId)
                        ->where('status', 'completed')
                        ->whereBetween('paid_at', [
                            $monthStart . ' 00:00:00',
                            $monthEnd   . ' 23:59:59',
                        ])
                        ->sum('amount'),
                ],
            ],
            [
                'id'             => 2,
                'name'           => 'Dentist Productivity',
                'scope'          => 'By provider',
                'owner'          => 'Operations',
                'format'         => 'PDF',
                'description'    => 'Appointments completed, chair time utilization, and revenue per dentist.',
                'last_generated' => $now->subDay()->format('d M Y'),
                'status'         => 'ready',
                'meta'           => [
                    'dentist_count' => Staff::where('clinic_id', $clinicId)
                                ->whereHas('user', function($q) {
                                    $q->where('role', 'dentist');
                                })->count(),
                ],
            ],
            [
                'id'             => 3,
                'name'           => 'Expiry Alert Report',
                'scope'          => 'Inventory',
                'owner'          => 'Store Lead',
                'format'         => 'XLSX',
                'description'    => 'Items expiring within 90 days across all branches with reorder recommendations.',
                'last_generated' => $now->format('d M Y H:i'),
                'status'         => 'ready',
                'meta'           => [
                    'expiring_items' => InventoryItem::where('clinic_id', $clinicId)
                        ->whereNotNull('expiry_date')
                        ->whereDate('expiry_date', '<=', now()->addDays(90))
                        ->count(),
                ],
            ],
            [
                'id'             => 4,
                'name'           => 'Patient Financial Exposure',
                'scope'          => 'Clinic-wide',
                'owner'          => 'Finance',
                'format'         => 'XLSX',
                'description'    => 'Outstanding balances, write-offs, and payment plans by patient.',
                'last_generated' => $now->subDays(2)->format('d M Y'),
                'status'         => Invoice::forClinic($clinicId)
                    ->where('status', 'overdue')->exists()
                    ? 'needs_attention' : 'ready',
                'meta'           => [
                    'overdue_invoices' => Invoice::forClinic($clinicId)
                        ->where('status', 'overdue')->count(),
                    'total_outstanding'=> (float) Invoice::forClinic($clinicId)
                        ->whereIn('status', ['sent', 'partial', 'overdue'])
                        ->sum('balance'),
                ],
            ],
            [
                'id'             => 5,
                'name'           => 'Branch Performance Comparison',
                'scope'          => 'Multi-branch',
                'owner'          => 'Operations',
                'format'         => 'PDF, XLSX',
                'description'    => 'Revenue, patient volume, and appointment completion rate per branch.',
                'last_generated' => $now->subDays(5)->format('d M Y'),
                'status'         => 'ready',
                'meta'           => [
                    'total_patients' => Patient::where('clinic_id', $clinicId)->count(),
                ],
            ],
            [
                'id'             => 6,
                'name'           => 'Inventory Stock Summary',
                'scope'          => 'Inventory',
                'owner'          => 'Store Lead',
                'format'         => 'XLSX',
                'description'    => 'Current stock levels, low stock alerts, and inventory value per branch.',
                'last_generated' => $now->format('d M Y H:i'),
                'status'         => InventoryItem::where('clinic_id', $clinicId)
                    ->whereColumn('current_quantity', '<', 'reorder_threshold')
                    ->exists() ? 'needs_attention' : 'ready',
                'meta'           => [
                    'low_stock_count' => InventoryItem::where('clinic_id', $clinicId)
                        ->whereColumn('current_quantity', '<', 'reorder_threshold')
                        ->count(),
                ],
            ],
        ];

        $needsAttention = collect($reports)
            ->where('status', 'needs_attention')
            ->count();

        return response()->json([
            'success' => true,
            'data'    => $reports,
            'meta'    => [
                'total'          => count($reports),
                'needs_attention'=> $needsAttention,
                'last_updated'   => now()->format('d M Y H:i'),
            ],
        ]);
    }

    /**
     * POST /api/v1/clinic/reports/{id}/generate
     * Generate a specific report — returns download-ready data.
     */
    public function generate(Request $request, int $id): JsonResponse
    {
        $clinicId  = $this->clinicId();
        $now       = now();
        $monthStart= $now->copy()->startOfMonth()->format('Y-m-d');
        $monthEnd  = $now->copy()->endOfMonth()->format('Y-m-d');

        $data = match ($id) {

            // ── Revenue Performance ───────────────────────────────────────────
            1 => [
                'report'    => 'Revenue Performance',
                'period'    => $now->format('F Y'),
                'generated' => $now->format('d M Y H:i'),
                'summary'   => [
                    'mtd_revenue' => (float) Payment::forClinic($clinicId)
                        ->where('status', 'completed')
                        ->whereBetween('paid_at', [
                            $monthStart . ' 00:00:00',
                            $monthEnd   . ' 23:59:59',
                        ])
                        ->sum('amount'),
                    'mtd_expenses' => (float) Expense::forClinic($clinicId)
                        ->approved()
                        ->whereBetween('expense_date', [$monthStart, $monthEnd])
                        ->sum('amount'),
                    'total_invoices' => Invoice::forClinic($clinicId)
                        ->whereBetween('issued_at', [$monthStart, $monthEnd])
                        ->count(),
                ],
                'by_method' => Payment::forClinic($clinicId)
                    ->where('status', 'completed')
                    ->whereBetween('paid_at', [
                        $monthStart . ' 00:00:00',
                        $monthEnd   . ' 23:59:59',
                    ])
                    ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
                    ->groupBy('method')
                    ->get(),
            ],

            // ── Dentist Productivity ──────────────────────────────────────────
            2 => [
                'report'    => 'Dentist Productivity',
                'period'    => $now->format('F Y'),
                'generated' => $now->format('d M Y H:i'),
                'dentists'  => Staff::where('clinic_id', $clinicId)
                        ->whereHas('user', function($q) {
                     $q->where('role', 'dentist');
                             })
                    ->with('branch:id,name')
                    ->get()
                    ->map(fn($s) => [
                        'name'   => $s->name,
                        'branch' => $s->branch?->name ?? '—',
                        'role'   => $s->role,
                    ]),
            ],

            // ── Expiry Alert ──────────────────────────────────────────────────
            3 => [
                'report'    => 'Expiry Alert Report',
                'generated' => $now->format('d M Y H:i'),
                'items'     => InventoryItem::where('clinic_id', $clinicId)
                    ->whereNotNull('expiry_date')
                    ->whereDate('expiry_date', '<=', now()->addDays(90))
                    ->with('branch:id,name')
                    ->orderBy('expiry_date')
                    ->get()
                    ->map(fn($i) => [
                        'name'        => $i->name,
                        'sku'         => $i->sku,
                        'branch'      => $i->branch?->name ?? '—',
                        'expiry_date' => $i->expiry_date?->format('Y-m-d'),
                        'quantity'    => $i->current_quantity,
                        'status'      => $i->status,
                    ]),
            ],

            // ── Patient Financial Exposure ─────────────────────────────────────
            4 => [
                'report'    => 'Patient Financial Exposure',
                'generated' => $now->format('d M Y H:i'),
                'summary'   => [
                    'total_outstanding' => (float) Invoice::forClinic($clinicId)
                        ->whereIn('status', ['sent', 'partial', 'overdue'])
                        ->sum('balance'),
                    'overdue_count'     => Invoice::forClinic($clinicId)
                        ->where('status', 'overdue')->count(),
                    'partial_count'     => Invoice::forClinic($clinicId)
                        ->where('status', 'partial')->count(),
                ],
                'invoices' => Invoice::forClinic($clinicId)
                    ->whereIn('status', ['sent', 'partial', 'overdue'])
                    ->with('patient:id,first_name,last_name')
                    ->orderByDesc('balance')
                    ->limit(20)
                    ->get()
                    ->map(fn($inv) => [
                        'invoice_number' => $inv->invoice_number,
                        'patient'        => $inv->patient
                            ? $inv->patient->first_name . ' ' . $inv->patient->last_name
                            : '—',
                        'total'   => (float) $inv->total,
                        'balance' => (float) $inv->balance,
                        'status'  => $inv->status,
                        'due_date'=> $inv->due_date?->format('Y-m-d'),
                    ]),
            ],

            // ── Branch Performance ────────────────────────────────────────────
            5 => [
                'report'    => 'Branch Performance Comparison',
                'period'    => $now->format('F Y'),
                'generated' => $now->format('d M Y H:i'),
                'summary'   => [
                    'total_patients'     => Patient::where('clinic_id', $clinicId)->count(),
                    'total_appointments' => Appointment::where('clinic_id', $clinicId)
                        ->whereBetween('appointment_time', [
                            $monthStart . ' 00:00:00',
                            $monthEnd   . ' 23:59:59',
                        ])->count(),
                ],
            ],

            // ── Inventory Stock Summary ───────────────────────────────────────
            6 => [
                'report'    => 'Inventory Stock Summary',
                'generated' => $now->format('d M Y H:i'),
                'summary'   => [
                    'total_skus'      => InventoryItem::where('clinic_id', $clinicId)->count(),
                    'low_stock_count' => InventoryItem::where('clinic_id', $clinicId)
                        ->whereColumn('current_quantity', '<', 'reorder_threshold')
                        ->count(),
                    'total_value'     => (float) InventoryItem::where('clinic_id', $clinicId)
                        ->get()
                        ->sum(fn($i) => $i->current_quantity * $i->unit_cost),
                ],
                'low_stock_items' => InventoryItem::where('clinic_id', $clinicId)
                    ->whereColumn('current_quantity', '<', 'reorder_threshold')
                    ->with('branch:id,name')
                    ->get()
                    ->map(fn($i) => [
                        'name'      => $i->name,
                        'sku'       => $i->sku,
                        'branch'    => $i->branch?->name ?? '—',
                        'quantity'  => $i->current_quantity,
                        'threshold' => $i->reorder_threshold,
                    ]),
            ],

            default => null,
        };

        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => "Report '{$data['report']}' generated successfully.",
            'data'    => $data,
        ]);
    }
}
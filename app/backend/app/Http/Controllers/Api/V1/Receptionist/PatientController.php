<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\User;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Clinic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    /**
     * GET /api/v1/receptionist/patients
     */
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $patients = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->with('branch:id,name')
            ->when($request->filled('search'), fn($q) => $q->search($request->search))
            ->when(
                $request->filled('gender') && $request->gender !== 'All',
                fn($q) => $q->where('gender', $request->gender)
            )
            ->orderBy('first_name')
            ->get()
            ->map->toApiArray();

        return response()->json([
            'success' => true,
            'data'    => $patients,
            'meta'    => [
                'total'  => $patients->count(),
                'active' => $patients->where('status', 'active')->count(),
            ],
        ]);
    }

    /**
     * GET /api/v1/receptionist/patients/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $patient = Patient::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->with(['branch:id,name', 'appointments', 'invoices'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => array_merge($patient->toApiArray(), [
                'appointments' => $patient->appointments->map(fn($a) => [
                    'id'     => $a->id,
                    'date'   => $a->appointment_time->toDateString(),
                    'time'   => $a->appointment_time->format('H:i'),
                    'type'   => $a->type,
                    'status' => $a->status,
                ]),
                'invoices' => $patient->invoices->map(fn($i) => [
                    'id'             => $i->id,
                    'invoice_number' => $i->invoice_number,
                    'total'          => $i->total,
                    'balance'        => $i->balance,
                    'status'         => $i->status,
                ]),
            ]),
        ]);
    }

    /**
     * POST /api/v1/receptionist/patients
     * 
     * CHANGES:
     * 1. Check for duplicate patient before creation
     * 2. Auto-create clinic card invoice on registration
     * 3. Card is NOT active until payment is recorded
     */
    public function store(Request $request): JsonResponse
    {
        $user     = $request->user();
        $clinicId = $user->clinic_id;
        $branchId = $user->branch_id;

        $validated = $request->validate([
            'first_name'         => 'required|string|max:255',
            'last_name'          => 'required|string|max:255',
            'phone'              => 'required|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date|before:today',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
        ]);

        // ─────────────────────────────────────────────────────────
        // 1. CHECK FOR DUPLICATE PATIENT
        // ─────────────────────────────────────────────────────────
        $existingPatient = Patient::forClinic($clinicId)
            ->forBranch($branchId)
            ->where(function ($query) use ($validated) {
                $query->where('phone', $validated['phone'])
                    ->orWhere(function ($q) use ($validated) {
                        if (!empty($validated['email'])) {
                            $q->where('email', $validated['email']);
                        }
                    });
            })
            ->first();

        if ($existingPatient) {
            return response()->json([
                'success' => false,
                'message' => 'Patient already registered with this phone number or email.',
                'code' => 'PATIENT_ALREADY_EXISTS',
                'data' => [
                    'patient_id' => $existingPatient->id,
                    'full_name' => $existingPatient->full_name,
                    'phone' => $existingPatient->phone,
                ],
            ], 409);
        }

        // ─────────────────────────────────────────────────────────
        // 2. CREATE PATIENT RECORD (WITHOUT ACTIVE CARD)
        // ─────────────────────────────────────────────────────────
        $portalUser = null;
        if (!empty($validated['email'])) {
            $portalUser = User::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'name'      => "{$validated['first_name']} {$validated['last_name']}",
                    'password'  => Hash::make($validated['phone']),
                    'role'      => 'patient',
                    'clinic_id' => $clinicId,
                    'branch_id' => $branchId,
                    'phone'     => $validated['phone'],
                    'is_active' => true,
                ]
            );
        }

        $patient = Patient::create([
            ...$validated,
            'clinic_id'  => $clinicId,
            'branch_id'  => $branchId,
            'user_id'    => $portalUser?->id,
            'created_by' => $user->id,
            'status'     => 'active',
            // Card fields: NOT active until payment
            'has_card'   => false,
            'card_is_active' => false,
            'card_number' => null,
        ]);

        // ─────────────────────────────────────────────────────────
        // 3. AUTO-CREATE CLINIC CARD INVOICE
        // ─────────────────────────────────────────────────────────
        $clinic = Clinic::find($clinicId);
        $cardPrice = $clinic ? $clinic->getCardPrice() : 100;

        $invoiceNumber = Invoice::generateNumber($clinicId);

        $invoice = Invoice::create([
            'clinic_id'      => $clinicId,
            'branch_id'      => $branchId,
            'patient_id'     => $patient->id,
            'appointment_id' => null,
            'created_by'     => $user->id,
            'invoice_number' => $invoiceNumber,
            'total'          => $cardPrice,
            'paid'           => 0,
            'balance'        => $cardPrice,
            'status'         => 'sent',
            'issued_at'      => now(),
            'due_date'       => now()->addDays(15),
            'notes'          => 'Clinic Card (Membership) - Payment required to activate card',
        ]);

        // Add invoice item for clinic card
        InvoiceItem::create([
            'invoice_id'  => $invoice->id,
            'description' => 'Clinic Card (Membership) - One-time registration fee',
            'quantity'    => 1,
            'unit_price'  => $cardPrice,
            'total'       => $cardPrice,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Patient registered successfully.' .
                ($portalUser ? ' Portal login created.' : '') .
                " Clinic card invoice created (ETB {$cardPrice}). Card will activate after payment.",
            'data'    => array_merge($patient->load('branch:id,name')->toApiArray(), [
                'card_invoice' => [
                    'id'             => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount'         => $cardPrice,
                    'status'         => $invoice->status,
                ],
            ]),
        ], 201);
    }

    /**
     * PUT /api/v1/receptionist/patients/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $patient = Patient::forClinic($user->clinic_id)
            ->forBranch($user->branch_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'first_name'         => 'sometimes|string|max:255',
            'last_name'          => 'sometimes|string|max:255',
            'phone'              => 'sometimes|string|max:20',
            'email'              => 'nullable|email|max:255',
            'date_of_birth'      => 'nullable|date|before:today',
            'gender'             => 'nullable|in:male,female,other',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string|max:500',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number'   => 'nullable|string|max:100',
            'current_case'       => 'nullable|string',
            'medical_history'    => 'nullable|string',
            'other_conditions'   => 'nullable|string',
        ]);

        // Check for duplicate on update (excluding current patient)
        if ($request->filled('phone') || $request->filled('email')) {
            $duplicateQuery = Patient::forClinic($user->clinic_id)
                ->forBranch($user->branch_id)
                ->where('id', '!=', $patient->id);

            if ($request->filled('phone')) {
                $duplicateQuery->where('phone', $validated['phone']);
            }
            if ($request->filled('email') && !empty($validated['email'])) {
                $duplicateQuery->orWhere('email', $validated['email']);
            }

            $duplicate = $duplicateQuery->first();
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Another patient already registered with this phone number or email.',
                    'code' => 'DUPLICATE_PATIENT',
                ], 409);
            }
        }

        // Create portal user if email added and none exists
        if (!empty($validated['email']) && !$patient->user_id) {
            $portalUser = User::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'name'      => $patient->full_name,
                    'password'  => Hash::make($patient->phone ?? 'password'),
                    'role'      => 'patient',
                    'clinic_id' => $user->clinic_id,
                    'branch_id' => $user->branch_id,
                    'phone'     => $patient->phone,
                    'is_active' => true,
                ]
            );
            $validated['user_id'] = $portalUser->id;
        }

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Patient updated successfully.',
            'data'    => $patient->fresh('branch:id,name')->toApiArray(),
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1\Landing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landing\RegisterClinicRequest;
use App\Services\Landing\ClinicRegistrationService;
use Illuminate\Http\JsonResponse;

class RegisterClinicController extends Controller
{
    public function __construct(
        private readonly ClinicRegistrationService $registrationService
    ) {}

    /**
     * POST /api/v1/register-clinic
     *
     * Step 1 of registration:
     *   - Creates the clinic record (status: pending_payment)
     *   - Creates the clinic admin user (inactive)
     *   - Creates a pending subscription record
     *   - Returns data needed to proceed to payment (Step 2)
     */
    public function store(RegisterClinicRequest $request): JsonResponse
    {
        try {
            $result = $this->registrationService->register($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Clinic registered successfully. Please complete payment to proceed.',
                'data'    => [
                    'clinic' => [
                        'id'        => $result['clinic']->id,
                        'name'      => $result['clinic']->name,
                        'email'     => $result['clinic']->email,
                        'status'    => $result['clinic']->status,
                        'subdomain' => $result['clinic']->subdomain,
                    ],
                    'admin' => [
                        'id'    => $result['user']->id,
                        'name'  => $result['user']->name,
                        'email' => $result['user']->email,
                    ],
                    'subscription' => [
                        'id'             => $result['subscription']->id,
                        'plan'           => $result['plan']->name,
                        'plan_type'      => $result['plan']->type,
                        'billing_cycle'  => $result['subscription']->billing_cycle,
                        'amount_due'     => $result['amount'],
                        'payment_method' => $result['subscription']->payment_method,
                        'status'         => $result['subscription']->status,
                        'is_free'        => $result['plan']->isFree(),
                        'trial_ends_at'  => $result['plan']->isFree()
                            ? $result['subscription']->ends_at?->format('d M Y')
                            : null,
                    ],
                ],
            ], 201);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
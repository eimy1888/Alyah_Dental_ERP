<?php

namespace App\Http\Controllers\Api\V1\Landing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landing\MockPaymentRequest;
use App\Services\Landing\MockPaymentService;
use Illuminate\Http\JsonResponse;

class MockPaymentController extends Controller
{
    public function __construct(
        private readonly MockPaymentService $paymentService
    ) {}

    /**
     * POST /api/v1/mock-payment
     *
     * Step 2 of registration:
     *   - Simulates payment from Telebirr / Chapa / PayPal / Bank Transfer
     *   - Activates the subscription record
     *   - Moves the clinic to pending_platform_approval
     *   - In production this endpoint would be a webhook called by the gateway
     */
    public function store(MockPaymentRequest $request): JsonResponse
    {
        try {
            $result = $this->paymentService->processPayment($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Payment received successfully. Your clinic is now pending platform approval. You will receive an email once approved.',
                'data'    => [
                    'clinic' => [
                        'id'       => $result['clinic']->id,
                        'name'     => $result['clinic']->name,
                        'status'   => $result['clinic']->status,
                        'subdomain'=> $result['clinic']->subdomain,
                    ],
                    'payment' => [
                        'reference'    => $result['reference'],
                        'amount_paid'  => $result['amount'],
                        'method'       => $result['subscription']->payment_method,
                        'subscription' => [
                            'status'   => $result['subscription']->status,
                            'starts_at'=> $result['subscription']->starts_at,
                            'ends_at'  => $result['subscription']->ends_at,
                        ],
                    ],
                ],
            ], 200);

        } catch (\Exception $e) {
            $statusCode = str_contains($e->getMessage(), 'not awaiting payment') ? 422 : 500;

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $statusCode);
        }
    }

    /**
     * GET /api/v1/payment-status/{clinicId}
     *
     * Check the current payment/approval status of a clinic registration.
     * Useful for frontend polling after payment redirect.
     */
    public function status(int $clinicId): JsonResponse
    {
        $clinic = \App\Models\Clinic::with(['activeSubscription.plan', 'plan'])
            ->findOrFail($clinicId);

        return response()->json([
            'success' => true,
            'data'    => [
                'clinic_id'  => $clinic->id,
                'name'       => $clinic->name,
                'status'     => $clinic->status,
                'plan'       => $clinic->plan?->name,
                'subscription_status' => $clinic->activeSubscription?->status ?? 'pending',
                'subscription_ends_at'=> $clinic->subscription_ends_at,
            ],
        ]);
    }
}
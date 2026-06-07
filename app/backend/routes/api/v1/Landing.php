<?php

use App\Http\Controllers\Api\V1\Landing\MockPaymentController;
use App\Http\Controllers\Api\V1\Landing\PlanController;
use App\Http\Controllers\Api\V1\Landing\RegisterClinicController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Landing / Public Routes  (no authentication required)
|--------------------------------------------------------------------------
| These routes are consumed by the public landing page:
|   - Browsing plans
|   - Registering a new clinic (Step 1)
|   - Completing mock payment (Step 2)
|   - Polling registration/payment status
*/

// Plans
Route::get('plans',       [PlanController::class, 'index']);
Route::get('plans/{plan}',[PlanController::class, 'show']);

// Clinic registration — Step 1: create clinic + admin + pending subscription
Route::post('register-clinic', [RegisterClinicController::class, 'store']);

// Payment — Step 2: simulate gateway payment
Route::post('mock-payment',          [MockPaymentController::class, 'store']);
Route::get('payment-status/{clinic}', [MockPaymentController::class, 'status']);
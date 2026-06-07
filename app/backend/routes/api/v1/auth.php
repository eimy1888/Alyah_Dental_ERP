<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use Illuminate\Support\Facades\Route;

// ── Public ───────────────────────────────────────────────────────────────────
Route::post('auth/login',          [AuthController::class, 'login']);
Route::post('patient-register',    [AuthController::class, 'patientRegister']);

// ── Cookie-authenticated (no auth:sanctum — resolveUser() reads the cookie) ──
Route::post('auth/logout',         [AuthController::class, 'logout']);
Route::get('auth/me',              [AuthController::class, 'me']);
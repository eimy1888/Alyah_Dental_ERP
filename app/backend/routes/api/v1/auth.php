<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

// ── Public ───────────────────────────────────────────────────────────────────
Route::post('auth/login',           [AuthController::class, 'login']);
Route::post('patient-register',     [AuthController::class, 'patientRegister']);

// ── Password Reset (public — no cookie needed) ────────────────────────────────
Route::post('auth/forgot-password', [PasswordResetController::class, 'forgotPassword']);
Route::post('auth/reset-password',  [PasswordResetController::class, 'resetPassword']);

// ── Cookie-authenticated ───────────────────────────────────────────────────────
Route::post('auth/logout',          [AuthController::class, 'logout']);
Route::get('auth/me',               [AuthController::class, 'me']);

// ── Change password (requires login — cookie auth) ────────────────────────────
Route::middleware(['cookie.auth'])->group(function () {
    Route::post('auth/change-password', [PasswordResetController::class, 'changePassword']);
});
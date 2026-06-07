<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Receptionist\DashboardController;
use App\Http\Controllers\Api\V1\Receptionist\PatientController;
use App\Http\Controllers\Api\V1\Receptionist\AppointmentController;
use App\Http\Controllers\Api\V1\Receptionist\AppointmentBillingController;
use App\Http\Controllers\Api\V1\Receptionist\BillingController;
use App\Http\Controllers\Api\V1\Receptionist\InvoicePdfController;
use App\Http\Controllers\Api\V1\Receptionist\SettingController;
use App\Http\Controllers\Api\V1\Receptionist\WaitlistController;
use App\Http\Controllers\Api\V1\QueueController;

Route::middleware(['cookie.auth'])->prefix('receptionist')->group(function () {

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── Patients ──────────────────────────────────────────────────────────────
    Route::apiResource('patients', PatientController::class);

    // ── Appointments ──────────────────────────────────────────────────────────
    Route::prefix('appointments')->group(function () {
        Route::get('/dentists',       [AppointmentController::class, 'getDentists']);
        Route::get('/availability',   [AppointmentController::class, 'availability']);
        Route::get('/',               [AppointmentController::class, 'index']);
        Route::post('/',              [AppointmentController::class, 'store']);
        Route::post('/{id}/check-in', [AppointmentController::class, 'checkIn']);
        Route::put('/{id}',           [AppointmentController::class, 'update']);
        Route::put('/{id}/status',    [AppointmentController::class, 'updateStatus']);
        Route::delete('/{id}',        [AppointmentController::class, 'destroy']);

        // v2: Consolidated billing view per appointment
        Route::get('/{id}/billing',         [AppointmentBillingController::class, 'show']);
        // v2: Pre-payment / deposit
        Route::post('/{id}/billing/prepay', [AppointmentBillingController::class, 'recordPrePayment']);
    });

    // ── Billing (invoices + payments) ─────────────────────────────────────────
    Route::prefix('invoices')->group(function () {
        Route::get('/',               [BillingController::class, 'index']);
        Route::post('/',              [BillingController::class, 'store']);          // service invoices only
        Route::post('/{id}/payments', [AppointmentBillingController::class, 'recordPayment']);
        Route::get('/{id}/events',    [AppointmentBillingController::class, 'events']);
        Route::get('/{id}/pdf',       [InvoicePdfController::class, 'download']);   // ← Invoice PDF
    });
    Route::get('payments/recent', [BillingController::class, 'recentPayments']);

    // ── Appointment Types catalogue ───────────────────────────────────────────
    Route::get('appointment-types', [\App\Http\Controllers\Api\V1\Receptionist\AppointmentController::class, 'getAppointmentTypes']);

    // ── Waitlist ──────────────────────────────────────────────────────────────
    Route::get('waitlist',                [WaitlistController::class, 'index']);
    Route::post('waitlist',               [WaitlistController::class, 'store']);
    Route::put('waitlist/{id}',           [WaitlistController::class, 'update']);
    Route::delete('waitlist/{id}',        [WaitlistController::class, 'destroy']);
    Route::post('waitlist/{id}/call',     [WaitlistController::class, 'call']);

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('notifications/count', [SettingController::class, 'getNotificationCount']);

    // ── Settings ──────────────────────────────────────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/profile',          [SettingController::class, 'getProfile']);
        Route::put('/profile',          [SettingController::class, 'updateProfile']);
        Route::post('/change-password', [SettingController::class, 'changePassword']);
        Route::get('/branch-info',      [SettingController::class, 'getBranchInfo']);
        Route::get('/dentists',         [SettingController::class, 'getDentists']);
    });

    // ── Live Queue ────────────────────────────────────────────────────────────
    Route::get('queue',           [QueueController::class, 'index']);
    Route::delete('queue/{id}',   [QueueController::class, 'remove']);

    // ── Services ──────────────────────────────────────────────────────────────
    Route::get('services', [SettingController::class, 'getServices']);
});

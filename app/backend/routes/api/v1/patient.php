<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Patient\DashboardController;
use App\Http\Controllers\Api\V1\Patient\AppointmentController;
use App\Http\Controllers\Api\V1\Patient\MedicalRecordController;
use App\Http\Controllers\Api\V1\Patient\SettingsController;
use App\Http\Controllers\Api\V1\Patient\NotificationController;
use App\Http\Controllers\Api\V1\Patient\InvoiceController;

Route::middleware(['cookie.auth'])->prefix('patient')->group(function () {

    // ── Dashboard ─────────────────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── My Appointments ───────────────────────────────────
    Route::prefix('appointments')->group(function () {
        Route::get('/',              [AppointmentController::class, 'index']);
        Route::post('/',             [AppointmentController::class, 'store']);
        Route::get('/dentists',      [AppointmentController::class, 'getDentists']);
        Route::get('/availability',  [AppointmentController::class, 'availability']);
        Route::get('/{id}',          [AppointmentController::class, 'show']);
        Route::post('/{id}/delay',   [AppointmentController::class, 'markDelayed']);
        // v2: Patient sees live billing on their appointment
        Route::get('/{id}/billing',  [\App\Http\Controllers\Api\V1\Receptionist\AppointmentBillingController::class, 'show']);
    });

    // ── Services for patient dropdown ─────────────────────
    Route::get('services', [SettingsController::class, 'getServices']);  // ← ADD THIS

    // ── My Medical Records ────────────────────────────────
    Route::prefix('medical-records')->group(function () {
        Route::get('/',            [MedicalRecordController::class, 'index']);
        Route::get('/{type}/{id}', [MedicalRecordController::class, 'show']);
    });

    // ── My Invoices ───────────────────────────────────────
    Route::prefix('invoices')->group(function () {
        Route::get('/',           [InvoiceController::class, 'index']);
        Route::get('/summary',    [InvoiceController::class, 'summary']);
        Route::get('/{id}',       [InvoiceController::class, 'show']);
    });

    // ── Notifications ─────────────────────────────────────
    Route::get('notifications',             [NotificationController::class, 'index']);
    Route::put('notifications/{id}/read',   [NotificationController::class, 'markRead']);
    Route::put('notifications/read-all',    [NotificationController::class, 'markAllRead']);

    // ── Settings ──────────────────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/profile',          [SettingsController::class, 'getProfile']);
        Route::put('/profile',          [SettingsController::class, 'updateProfile']);
        Route::post('/change-password', [SettingsController::class, 'changePassword']);
        Route::get('/clinic-info',      [SettingsController::class, 'getClinicInfo']);
    });

        // ── Notifications ─────────────────────────────────────────────────────
    Route::get('notifications/count', [NotificationController::class, 'count']);  // ← ADD THIS
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::put('notifications/read-all', [NotificationController::class, 'markAllRead']);
});
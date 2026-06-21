<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Patient\DashboardController;
use App\Http\Controllers\Api\V1\Patient\AppointmentController;
use App\Http\Controllers\Api\V1\Patient\MedicalRecordController;
use App\Http\Controllers\Api\V1\Patient\SettingsController;
use App\Http\Controllers\Api\V1\Patient\NotificationController;
use App\Http\Controllers\Api\V1\Patient\InvoiceController;

Route::middleware(['cookie.auth', 'subdomain.access'])->prefix('patient')->group(function () {

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
        Route::get('/prescriptions', [MedicalRecordController::class, 'prescriptions']);
        Route::get('/xrays', [MedicalRecordController::class, 'xrays']);
        Route::get('/clinical-notes', [MedicalRecordController::class, 'clinicalNotes']);
        Route::get('/{type}/{id}', [MedicalRecordController::class, 'show']);
    });

    // ── My Invoices ───────────────────────────────────────
    Route::prefix('invoices')->group(function () {
        Route::get('/',           [InvoiceController::class, 'index']);
        Route::get('/summary',    [InvoiceController::class, 'summary']);
        Route::get('/{id}',       [InvoiceController::class, 'show']);
    });

    // ── Notifications ─────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/count',      [NotificationController::class, 'count']);
        Route::get('/',           [NotificationController::class, 'index']);
        Route::put('/{id}/read',  [NotificationController::class, 'markRead']);
        Route::put('/read-all',   [NotificationController::class, 'markAllRead']);
    });

    // ── Settings ──────────────────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/profile',          [SettingsController::class, 'getProfile']);
        Route::put('/profile',          [SettingsController::class, 'updateProfile']);
        Route::post('/change-password', [SettingsController::class, 'changePassword']);
        Route::get('/clinic-info',      [SettingsController::class, 'getClinicInfo']);
    });
});

<?php

use App\Http\Controllers\Api\V1\Platform\ClinicController;
use App\Http\Controllers\Api\V1\Platform\UserController;
use App\Http\Controllers\Api\V1\Platform\PlanController;
use App\Http\Controllers\Api\V1\Platform\SettingsController;
use App\Http\Controllers\Api\V1\Platform\AnalyticsController;
use App\Http\Controllers\Api\V1\Platform\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['cookie.auth'])->prefix('platform')->group(function () {

    // ── Analytics ────────────────────────────────────────────────────────────
    Route::get('analytics', [AnalyticsController::class, 'index']);

    // ── Clinics ───────────────────────────────────────────────────────────────
    Route::get('clinics',                              [ClinicController::class, 'index']);
    Route::get('clinics/{clinic}',                     [ClinicController::class, 'show']);
    Route::post('clinics/{clinic}/approve',            [ClinicController::class, 'approve']);
    Route::post('clinics/{clinic}/reject',             [ClinicController::class, 'reject']);
    Route::post('clinics/{clinic}/suspend',            [ClinicController::class, 'suspend']);
    Route::post('clinics/{clinic}/reactivate',         [ClinicController::class, 'reactivate']);

    // Subdomain access control — Clinic
    Route::post('clinics/{clinic}/disable-subdomain',  [ClinicController::class, 'disableSubdomain']);
    Route::post('clinics/{clinic}/enable-subdomain',   [ClinicController::class, 'enableSubdomain']);

    // Subdomain access control — Branch
    Route::post('branches/{branch}/disable-subdomain', [ClinicController::class, 'disableBranchSubdomain']);
    Route::post('branches/{branch}/enable-subdomain',  [ClinicController::class, 'enableBranchSubdomain']);

    // Plan assignment + billing
    Route::post('clinics/{clinic}/assign-plan',        [PlanController::class, 'assignToClinic']);
    Route::post('clinics/{clinic}/record-payment',     [PlanController::class, 'recordPayment']);
    Route::get('clinics/{clinic}/payment-history',     [PlanController::class, 'paymentHistory']);

    // ── Users ─────────────────────────────────────────────────────────────────
    Route::get('users', [UserController::class, 'index']);

    // ── Plans CRUD ────────────────────────────────────────────────────────────
    Route::get('plans',            [PlanController::class, 'index']);
    Route::get('plans/{plan}',     [PlanController::class, 'show']);
    Route::post('plans',           [PlanController::class, 'store']);
    Route::put('plans/{plan}',     [PlanController::class, 'update']);
    Route::delete('plans/{plan}',  [PlanController::class, 'destroy']);

    // ── Settings ──────────────────────────────────────────────────────────────
    Route::get('settings/profile',  [SettingsController::class, 'profile']);
    Route::put('settings/profile',  [SettingsController::class, 'updateProfile']);
    Route::put('settings/password', [SettingsController::class, 'updatePassword']);

    // ── Audit Logs ────────────────────────────────────────────────────────────
    Route::get('audit-logs',          [AuditLogController::class, 'index']);
    Route::get('audit-logs/events',   [AuditLogController::class, 'events']);
    Route::get('audit-logs/{auditLog}',[AuditLogController::class, 'show']);
});

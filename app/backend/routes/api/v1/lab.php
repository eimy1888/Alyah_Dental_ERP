<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Lab\LabDashboardController;
use App\Http\Controllers\Api\V1\Lab\LabOrderController;
use App\Http\Controllers\Api\V1\Lab\LabSettingsController;

Route::middleware(['cookie.auth', 'subdomain.access'])->prefix('lab')->group(function () {

    // ── Dashboard ─────────────────────────────────────────
    Route::get('dashboard', [LabDashboardController::class, 'index']);

    // ── Lab Orders ────────────────────────────────────────
    Route::get('orders',             [LabOrderController::class, 'index']);
    Route::get('orders/{id}',        [LabOrderController::class, 'show']);
    Route::put('orders/{id}/status', [LabOrderController::class, 'updateStatus']);
    Route::post('orders/{id}/notes', [LabOrderController::class, 'addNote']);

    // ── Settings ──────────────────────────────────────────
    Route::get('settings/profile',          [LabSettingsController::class, 'getProfile']);
    Route::put('settings/profile',          [LabSettingsController::class, 'updateProfile']);
    Route::post('settings/change-password', [LabSettingsController::class, 'changePassword']);

    // ── Notifications count (stub) ────────────────────────
    Route::get('notifications/count', function (\Illuminate\Http\Request $r) {
        return response()->json(['success' => true, 'count' => 0]);
    });
});

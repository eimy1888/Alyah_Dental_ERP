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

    // ── Notifications (real — lab technician receives lab order alerts) ──────
    Route::get('notifications/count', function (\Illuminate\Http\Request $r) {
        $count = $r->user()->unreadNotifications()->count();
        return response()->json(['success' => true, 'count' => $count]);
    });
    Route::get('notifications', function (\Illuminate\Http\Request $r) {
        $notifications = $r->user()->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn($n) => [
                'id'        => $n->id,
                'type'      => $n->data['type'] ?? $n->type,
                'title'     => $n->data['title'] ?? '',
                'message'   => $n->data['message'] ?? '',
                'data'      => $n->data,
                'read_at'   => $n->read_at?->toDateTimeString(),
                'created_at'=> $n->created_at->toDateTimeString(),
            ]);
        return response()->json(['success' => true, 'data' => $notifications]);
    });
    Route::put('notifications/{id}/read', function (\Illuminate\Http\Request $r, string $id) {
        $n = $r->user()->notifications()->where('id', $id)->first();
        if ($n) $n->markAsRead();
        return response()->json(['success' => true]);
    });
    Route::put('notifications/read-all', function (\Illuminate\Http\Request $r) {
        $r->user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    });
});

<?php

use App\Http\Controllers\Api\V1\Platform\ClinicController;
use App\Http\Controllers\Api\V1\Platform\UserController;
use App\Http\Controllers\Api\V1\Platform\PlanController;
use App\Http\Controllers\Api\V1\Platform\SettingsController;
use App\Http\Controllers\Api\V1\Platform\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['cookie.auth'])->prefix('platform')->group(function () {

    Route::get('analytics', [AnalyticsController::class, 'index']);

    Route::get('clinics',                      [ClinicController::class, 'index']);
    Route::post('clinics/{clinic}/approve',    [ClinicController::class, 'approve']);
    Route::post('clinics/{clinic}/reject',     [ClinicController::class, 'reject']);
    Route::post('clinics/{clinic}/suspend',    [ClinicController::class, 'suspend']);
    Route::post('clinics/{clinic}/reactivate', [ClinicController::class, 'reactivate']);

    Route::get('users', [UserController::class, 'index']);

    Route::get('plans',           [PlanController::class, 'index']);
    Route::post('plans',          [PlanController::class, 'store']);
    Route::put('plans/{plan}',    [PlanController::class, 'update']);
    Route::delete('plans/{plan}', [PlanController::class, 'destroy']);

    Route::get('settings/profile',  [SettingsController::class, 'profile']);
    Route::put('settings/profile',  [SettingsController::class, 'updateProfile']);
    Route::put('settings/password', [SettingsController::class, 'updatePassword']);
});
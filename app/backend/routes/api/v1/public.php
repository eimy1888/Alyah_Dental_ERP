<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Public\PublicShowcaseController;

// Public routes - clinic slug is passed as parameter
Route::prefix('public')->group(function () {
    Route::get('approved-clinics', [PublicShowcaseController::class, 'approvedClinics']);
    Route::get('clinic/{slug}/profile', [PublicShowcaseController::class, 'clinicProfile']);
    Route::get('clinic/{slug}/services', [PublicShowcaseController::class, 'services']);
    Route::get('clinic/{slug}/staff', [PublicShowcaseController::class, 'staff']);
    Route::get('clinic/{slug}/branches', [PublicShowcaseController::class, 'branches']);
    Route::get('clinic/{slug}/testimonials', [PublicShowcaseController::class, 'testimonials']);
    Route::post('clinic/{slug}/contact', [PublicShowcaseController::class, 'contact']);
});
<?php

use App\Http\Controllers\Api\V1\Manager\ManagerDashboardController;
use App\Http\Controllers\Api\V1\Manager\ManagerStaffController;
use App\Http\Controllers\Api\V1\Manager\ManagerPatientController;
use App\Http\Controllers\Api\V1\Manager\ManagerAppointmentController;
use App\Http\Controllers\Api\V1\Manager\ManagerWaitlistController;
use App\Http\Controllers\Api\V1\Manager\ManagerInventoryController;
use App\Http\Controllers\Api\V1\Manager\ManagerReportsController;
use App\Http\Controllers\Api\V1\Manager\ManagerSettingsController;
use App\Http\Controllers\Api\V1\Manager\ManagerDentistUnavailableController;
use App\Http\Controllers\Api\V1\QueueController;
use Illuminate\Support\Facades\Route;

Route::middleware(['cookie.auth'])->prefix('manager')->group(function () {

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('dashboard', [ManagerDashboardController::class, 'index']);

    // ── Staff ─────────────────────────────────────────────────────────────────
    Route::get('staff',         [ManagerStaffController::class, 'index']);
    Route::post('staff',        [ManagerStaffController::class, 'store']);
    Route::post('staff/{id}',   [ManagerStaffController::class, 'update']); // POST with _method=PUT
    Route::delete('staff/{id}', [ManagerStaffController::class, 'destroy']);

    // ── Dentists (dedicated endpoint for modals) ──────────────────────────────
    Route::get('dentists', [ManagerStaffController::class, 'getDentists']);

    // ── Services ──────────────────────────────────────────────────────────────
    // ✅ Only ONE services route — removed duplicate that pointed to Clinic\SettingsController
    Route::get('services', [ManagerSettingsController::class, 'getServices']);

    // ── Specializations (read-only, for dropdowns) ────────────────────────────
    Route::get('specializations', function (\Illuminate\Http\Request $req) {
        $specs = \App\Models\Specialization::forClinic($req->user()->clinic_id)
            ->active()->ordered()
            ->get(['id','name','short_code','description']);
        return response()->json(['success' => true, 'data' => $specs]);
    });

    // ── Patients ──────────────────────────────────────────────────────────────
    Route::get('patients',                                    [ManagerPatientController::class, 'index']);
    Route::post('patients',                                   [ManagerPatientController::class, 'store']);
    Route::get('patients/{patient}/suggested-dentist',        [ManagerPatientController::class, 'suggestedDentist']);
    Route::get('patients/{patient}',                          [ManagerPatientController::class, 'show']);
    Route::put('patients/{patient}',                          [ManagerPatientController::class, 'update']);
    Route::delete('patients/{patient}',                       [ManagerPatientController::class, 'destroy']);

    // ── Appointments ──────────────────────────────────────────────────────────
    // ✅ Static routes BEFORE dynamic {appointment} route to avoid conflict
    Route::prefix('appointments')->group(function () {
        Route::get('/availability',                           [ManagerAppointmentController::class, 'availability']);
        Route::get('/',                                       [ManagerAppointmentController::class, 'index']);
        Route::post('/',                                      [ManagerAppointmentController::class, 'store']);
        Route::put('/{appointment}',                          [ManagerAppointmentController::class, 'update']);
        Route::post('/{appointment}/check-in',                [ManagerAppointmentController::class, 'checkIn']);
        Route::delete('/{appointment}',                       [ManagerAppointmentController::class, 'destroy']);
        // v2: Consolidated billing view
        Route::get('/{id}/billing', [\App\Http\Controllers\Api\V1\Receptionist\AppointmentBillingController::class, 'show']);
    });

    // ── Waitlist ──────────────────────────────────────────────────────────────
    Route::get('waitlist',                                    [ManagerWaitlistController::class, 'index']);
    Route::post('waitlist',                                   [ManagerWaitlistController::class, 'store']);
    Route::post('waitlist/{waitlistEntry}/convert',           [ManagerWaitlistController::class, 'convertToAppointment']);
    Route::put('waitlist/{waitlistEntry}',                    [ManagerWaitlistController::class, 'update']);
    Route::delete('waitlist/{waitlistEntry}',                 [ManagerWaitlistController::class, 'destroy']);

    // ── Inventory ─────────────────────────────────────────────────────────────
    Route::get('inventory',                                   [ManagerInventoryController::class, 'index']);
    Route::post('inventory',                                  [ManagerInventoryController::class, 'store']);
    Route::get('inventory/{id}',                              [ManagerInventoryController::class, 'show']);
    Route::put('inventory/{item}',                            [ManagerInventoryController::class, 'update']);
    Route::delete('inventory/{item}',                         [ManagerInventoryController::class, 'destroy']);
    Route::post('inventory/{item}/adjust',                    [ManagerInventoryController::class, 'adjust']);

    // ── Reports ───────────────────────────────────────────────────────────────
    Route::get('reports',              [ManagerReportsController::class, 'index']);
    Route::get('reports/summary',      [ManagerReportsController::class, 'summary']);
    Route::get('reports/appointments', [ManagerReportsController::class, 'appointments']);
    Route::get('reports/inventory',    [ManagerReportsController::class, 'inventory']);

    // ── Settings ──────────────────────────────────────────────────────────────
    Route::get('settings/profile',     [ManagerSettingsController::class, 'profile']);
    Route::put('settings/profile',     [ManagerSettingsController::class, 'updateProfile']);
    Route::put('settings/password',    [ManagerSettingsController::class, 'updatePassword']);

    // ── Live Queue ────────────────────────────────────────────────────────────
    Route::get('queue',                          [QueueController::class, 'index']);
    Route::post('queue/emergency-override',      [QueueController::class, 'emergencyOverride']);
    Route::delete('queue/{id}',                  [QueueController::class, 'remove']);

    // ── Dentist Unavailable Management ────────────────────────────────────────
    Route::prefix('dentist-unavailable')->group(function () {
        Route::get('/dentists',                               [ManagerDentistUnavailableController::class, 'getDentists']);
        Route::post('/mark',                                  [ManagerDentistUnavailableController::class, 'markUnavailable']);
        Route::post('/mark-available',                        [ManagerDentistUnavailableController::class, 'markAvailable']);
        Route::get('/{dentistId}/affected-appointments',      [ManagerDentistUnavailableController::class, 'getAffectedAppointments']);
        Route::get('/{dentistId}/available-dentists',         [ManagerDentistUnavailableController::class, 'getAvailableDentistsForReassignment']);
        Route::post('/reassign',                              [ManagerDentistUnavailableController::class, 'reassignAppointment']);
        Route::post('/reassign-all',                          [ManagerDentistUnavailableController::class, 'reassignAllAppointments']);
    });

        // ── Notifications ──────────────────────────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\V1\Manager\ManagerNotificationController::class, 'index']);
        Route::get('/count', [\App\Http\Controllers\Api\V1\Manager\ManagerNotificationController::class, 'count']);
        Route::put('/{id}/read', [\App\Http\Controllers\Api\V1\Manager\ManagerNotificationController::class, 'markRead']);
        Route::put('/read-all', [\App\Http\Controllers\Api\V1\Manager\ManagerNotificationController::class, 'markAllRead']);
    });
});
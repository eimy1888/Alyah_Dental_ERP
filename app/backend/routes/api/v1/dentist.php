<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Dentist\DashboardController;
use App\Http\Controllers\Api\V1\Dentist\AppointmentController;
use App\Http\Controllers\Api\V1\Dentist\PatientController;
use App\Http\Controllers\Api\V1\Dentist\MedicalRecordController;
use App\Http\Controllers\Api\V1\Dentist\NotificationController;
use App\Http\Controllers\Api\V1\Dentist\SettingsController;
use App\Http\Controllers\Api\V1\Dentist\ReferralController;
use App\Http\Controllers\Api\V1\Dentist\TreatmentEpisodeController;
use App\Http\Controllers\Api\V1\Dentist\TreatmentPlanController;
use App\Http\Controllers\Api\V1\Dentist\PrescriptionController;
use App\Http\Controllers\Api\V1\Dentist\XRayController;
use App\Http\Controllers\Api\V1\Dentist\ClinicalNoteController;
use App\Http\Controllers\Api\V1\QueueController;

Route::middleware(['cookie.auth', 'subdomain.access'])->prefix('dentist')->group(function () {

    // ── Dashboard ─────────────────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── Notifications ─────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/',           [NotificationController::class, 'index']);
        Route::get('/count',      [NotificationController::class, 'count']);
        Route::post('/mark-read', [NotificationController::class, 'markRead']);
    });

    Route::prefix('prescriptions')->group(function () {
        Route::post('/', [PrescriptionController::class, 'store']);
        Route::get('/{id}', [PrescriptionController::class, 'show']);
        Route::put('/{id}', [PrescriptionController::class, 'update']);
        Route::post('/{id}/finalize', [PrescriptionController::class, 'finalize']);
        Route::get('/{id}/print', [PrescriptionController::class, 'print']);
    });

    Route::prefix('xrays')->group(function () {
        Route::post('/', [XRayController::class, 'store']);
        Route::get('/{id}', [XRayController::class, 'show']);
    });

    Route::prefix('clinical-notes')->group(function () {
        Route::post('/', [ClinicalNoteController::class, 'store']);
        Route::put('/{id}', [ClinicalNoteController::class, 'update']);
        Route::post('/{id}/sign', [ClinicalNoteController::class, 'sign']);
    });

    // ── Appointments ──────────────────────────────────────
    Route::prefix('appointments')->group(function () {
        Route::get('/',            [AppointmentController::class, 'index']);
        Route::get('/export',      [AppointmentController::class, 'export']);
        Route::get('/today',       [AppointmentController::class, 'today']);
        Route::get('/{id}',        [AppointmentController::class, 'show']);
        Route::put('/{id}/status', [AppointmentController::class, 'updateStatus']);

        // v2: Live billing preview per appointment
        Route::get('/{id}/billing', [TreatmentEpisodeController::class, 'billingPreview']);

        // v2: Episode management per appointment
        Route::get('/{appointmentId}/episodes',  [TreatmentEpisodeController::class, 'index']);
        Route::post('/{appointmentId}/episodes', [TreatmentEpisodeController::class, 'store']);
    });

    // ── Clinical note signing ─────────────────────────────

    // ── Patients ──────────────────────────────────────────
    Route::prefix('patients')->group(function () {
        Route::get('/',               [PatientController::class, 'index']);
        Route::get('/{id}',           [PatientController::class, 'show']);
        Route::get('/{id}/prescriptions', [PrescriptionController::class, 'patientHistory']);
        Route::get('/{id}/xrays', [XRayController::class, 'patientHistory']);
        Route::get('/{id}/clinical-notes', [ClinicalNoteController::class, 'patientHistory']);
        Route::post('/{id}/notes',    [PatientController::class, 'addNote']);
        Route::put('/{id}/insurance', [PatientController::class, 'updateInsurance']);
    });

    // ── Medical Records ───────────────────────────────────
    Route::prefix('medical-records')->group(function () {
        Route::get('/',            [MedicalRecordController::class, 'index']);
        Route::get('/{type}/{id}', [MedicalRecordController::class, 'show']);
    });

    // ── Settings ──────────────────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/profile',          [SettingsController::class, 'getProfile']);
        Route::put('/profile',          [SettingsController::class, 'updateProfile']);
        Route::post('/change-password', [SettingsController::class, 'changePassword']);
        Route::get('/clinic-info',      [SettingsController::class, 'getClinicInfo']);
        Route::get('/services',         [SettingsController::class, 'getServices']);
    });

    // ── Live Queue ────────────────────────────────────────
    Route::get('queue',            [QueueController::class, 'dentistQueue']);
    Route::post('queue/call-next', [QueueController::class, 'callNext']);

    // ── Recalls ───────────────────────────────────────────
    Route::get('recalls', [AppointmentController::class, 'recalls']);
    Route::post('appointments/{id}/set-recall', [AppointmentController::class, 'setRecall']);

    // ── Referrals ─────────────────────────────────────────
    Route::prefix('referral')->group(function () {
        Route::get('/dentists', [ReferralController::class, 'getAvailableDentists']);
        Route::post('/refer',   [ReferralController::class, 'refer']);
    });

    // ── Lab Orders (dentist creates) ──────────────────────
    Route::prefix('lab-orders')->group(function () {
        Route::get('/',    [\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'index']);
        Route::post('/',   [\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'store']);
        Route::get('/{id}',[\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'show']);
        Route::put('/{id}/status', [\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'updateStatus']);
        Route::post('/{id}/acknowledge', [\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'acknowledge']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Dentist\LabOrderController::class, 'destroy']);
    });

    // ── Procedures (legacy + v2 unified) ─────────────────
    Route::prefix('procedures')->group(function () {
        Route::get('/appointment/{appointmentId}',      [MedicalRecordController::class, 'getAppointmentProcedures']);
        Route::post('/',                                [MedicalRecordController::class, 'addProcedure']);
        Route::delete('/{procedureId}',                 [MedicalRecordController::class, 'deleteProcedure']);
        Route::post('/complete/{appointmentId}',        [MedicalRecordController::class, 'completeProcedures']);
    });

    // ── Treatment Episodes (v2) ───────────────────────────
    Route::prefix('episodes')->group(function () {
        Route::put('/{episodeId}',                      [TreatmentEpisodeController::class, 'update']);
        Route::post('/{episodeId}/procedures',          [TreatmentEpisodeController::class, 'addProcedure']);
        Route::delete('/{episodeId}/procedures/{procedureId}', [TreatmentEpisodeController::class, 'removeProcedure']);
        Route::post('/{episodeId}/finalize',            [TreatmentEpisodeController::class, 'finalize']);
        Route::post('/{episodeId}/pending-lab',         [TreatmentEpisodeController::class, 'markPendingLab']);
        Route::post('/{episodeId}/resume',              [TreatmentEpisodeController::class, 'resumeFromLab']);
    });

    // ── Treatment Plans (smart booking flow) ─────────────
    Route::prefix('treatment-plans')->group(function () {
        Route::get('/diagnostic-services',              [TreatmentPlanController::class, 'diagnosticServices']);
        Route::post('/diagnostic-test',                 [TreatmentPlanController::class, 'orderDiagnosticTest']);
        Route::get('/',                                 [TreatmentPlanController::class, 'index']);
        Route::post('/',                                [TreatmentPlanController::class, 'store']);
        Route::get('/{id}',                             [TreatmentPlanController::class, 'show']);
        Route::put('/{id}',                             [TreatmentPlanController::class, 'update']);
        Route::post('/{id}/propose',                    [TreatmentPlanController::class, 'propose']);
        Route::post('/{id}/approve',                    [TreatmentPlanController::class, 'approve']);
        Route::post('/{id}/reject',                     [TreatmentPlanController::class, 'reject']);
        Route::post('/{id}/complete',                   [TreatmentPlanController::class, 'complete']);
    });
});

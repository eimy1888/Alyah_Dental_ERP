<?php

use App\Http\Controllers\Api\V1\Clinic\BranchController;
use App\Http\Controllers\Api\V1\Clinic\StaffController;
use App\Http\Controllers\Api\V1\Clinic\InventoryController;
use App\Http\Controllers\Api\V1\Clinic\ReportsController;
use App\Http\Controllers\Api\V1\Clinic\PatientController;
use App\Http\Controllers\Api\V1\Clinic\BillingController;
use App\Http\Controllers\Api\V1\Clinic\FinanceController;
use App\Http\Controllers\Api\V1\Clinic\SettingsController;
use App\Http\Controllers\Api\V1\Clinic\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['cookie.auth', 'subdomain.access'])->prefix('admin')->group(function () {

    // ── Appointments (Clinic Admin — read + status + cancel across all branches) ──
    Route::get('appointments',              [\App\Http\Controllers\Api\V1\Receptionist\AppointmentController::class, 'index']);
    Route::put('appointments/{id}/status',  [\App\Http\Controllers\Api\V1\Receptionist\AppointmentController::class, 'updateStatus']);
    Route::delete('appointments/{id}',      [\App\Http\Controllers\Api\V1\Receptionist\AppointmentController::class, 'destroy']);

    Route::get('dashboard', [DashboardController::class, 'index']);

    Route::get('branches',             [BranchController::class, 'index']);
    Route::post('branches',            [BranchController::class, 'store']);
    Route::put('branches/{branch}',    [BranchController::class, 'update']);
    Route::delete('branches/{branch}', [BranchController::class, 'destroy']);

    Route::get('staff',                [StaffController::class, 'index']);
    Route::post('staff',               [StaffController::class, 'store']);
    Route::put('staff/{staff}',        [StaffController::class, 'update']);
    Route::delete('staff/{staff}',     [StaffController::class, 'destroy']);

    Route::get('inventory',                     [InventoryController::class, 'index']);
    Route::post('inventory',                    [InventoryController::class, 'store']);
    Route::put('inventory/{item}',              [InventoryController::class, 'update']);
    Route::delete('inventory/{item}',           [InventoryController::class, 'destroy']);
    Route::post('inventory/{item}/adjust',      [InventoryController::class, 'adjust']);
    Route::get('inventory/{item}/transactions', [InventoryController::class, 'transactions']);

    Route::get('patients',              [PatientController::class, 'index']);
    Route::post('patients',             [PatientController::class, 'store']);
    Route::get('patients/{patient}',    [PatientController::class, 'show']);
    Route::put('patients/{patient}',    [PatientController::class, 'update']);
    Route::delete('patients/{patient}', [PatientController::class, 'destroy']);

    Route::get('billing/invoices',                [BillingController::class, 'invoices']);
    Route::post('billing/invoices',               [BillingController::class, 'createInvoice']);
    Route::get('billing/invoices/{invoice}',      [BillingController::class, 'showInvoice']);
    Route::post('billing/invoices/{invoice}/pay', [BillingController::class, 'recordPayment']);
    Route::get('billing/payments',                [BillingController::class, 'payments']);
    Route::get('billing/weekly-collections',      [BillingController::class, 'weeklyCollections']);

    Route::get('finance/summary',               [FinanceController::class, 'summary']);
    Route::get('finance/revenue-trend',         [FinanceController::class, 'revenueTrend']);
    Route::get('finance/branch-breakdown',      [FinanceController::class, 'branchBreakdown']);
    Route::get('finance/expenses',              [FinanceController::class, 'expenses']);
    Route::post('finance/expenses',             [FinanceController::class, 'storeExpense']);
    Route::delete('finance/expenses/{expense}', [FinanceController::class, 'deleteExpense']);

    Route::get('reports',                [ReportsController::class, 'index']);
    Route::post('reports/{id}/generate', [ReportsController::class, 'generate']);

    Route::get('settings',               [SettingsController::class, 'index']);
    Route::put('settings/clinic',        [SettingsController::class, 'updateClinic']);
    Route::put('settings/admin',         [SettingsController::class, 'updateAdmin']);
    Route::put('settings/password',      [SettingsController::class, 'updatePassword']);
    Route::put('settings/notifications', [SettingsController::class, 'updateNotifications']);
    Route::put('settings/tax-invoice',   [SettingsController::class, 'updateTaxInvoice']);

    Route::get('services',              [SettingsController::class, 'getServices']);
    Route::post('services',             [SettingsController::class, 'createService']);
    Route::put('services/{id}',         [SettingsController::class, 'updateService']);
    Route::delete('services/{id}',      [SettingsController::class, 'deleteService']);

    // Inventory items list — used in service editor to pick requirements
    Route::get('inventory-items',       [SettingsController::class, 'getInventoryItemsForServices']);

    // Specializations — CRUD (system defaults read-only, clinic customs editable)
    Route::get('specializations',                    [\App\Http\Controllers\Api\V1\Clinic\SpecializationController::class, 'index']);
    Route::post('specializations',                   [\App\Http\Controllers\Api\V1\Clinic\SpecializationController::class, 'store']);
    Route::put('specializations/{id}',               [\App\Http\Controllers\Api\V1\Clinic\SpecializationController::class, 'update']);
    Route::delete('specializations/{id}',            [\App\Http\Controllers\Api\V1\Clinic\SpecializationController::class, 'destroy']);

    Route::put('settings/showcase',     [SettingsController::class, 'updateShowcaseSettings']);
    Route::get('settings/showcase',     [SettingsController::class, 'getShowcaseSettings']);

    // ── Audit Log ─────────────────────────────────────────────────────────────
    Route::get('audit-logs',        [\App\Http\Controllers\Api\V1\Clinic\AuditLogController::class, 'index']);
    Route::get('audit-logs/events', [\App\Http\Controllers\Api\V1\Clinic\AuditLogController::class, 'events']);
});
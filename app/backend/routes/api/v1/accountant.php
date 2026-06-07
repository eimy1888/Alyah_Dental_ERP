<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Accountant\DashboardController;
use App\Http\Controllers\Api\V1\Accountant\RevenueController;
use App\Http\Controllers\Api\V1\Accountant\ExpenseController;
use App\Http\Controllers\Api\V1\Accountant\BillingController;
use App\Http\Controllers\Api\V1\Accountant\InvoiceReviewController;
use App\Http\Controllers\Api\V1\Accountant\ReportController;
use App\Http\Controllers\Api\V1\Accountant\SettingsController;

Route::middleware(['cookie.auth'])->prefix('accountant')->group(function () {

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── Patients & Branches (dropdowns) ──────────────────────────────────────
    Route::get('patients', [BillingController::class, 'getPatients']);
    Route::get('branches', [BillingController::class, 'getBranches']);

    // ── Revenue ───────────────────────────────────────────────────────────────
    Route::prefix('revenue')->group(function () {
        Route::get('/',        [RevenueController::class, 'index']);
        Route::get('/export',  [RevenueController::class, 'export']);
    });

    // ── Expenses ──────────────────────────────────────────────────────────────
    Route::prefix('expenses')->group(function () {
        Route::get('/',            [ExpenseController::class, 'index']);
        Route::get('/budget',      [ExpenseController::class, 'budget']);
        Route::get('/categories',  [ExpenseController::class, 'categories']);
        Route::post('/',           [ExpenseController::class, 'store']);
        Route::put('/{id}',        [ExpenseController::class, 'update']);
        Route::delete('/{id}',     [ExpenseController::class, 'destroy']);
    });

    // ── Invoices (legacy + v2 review workflow) ────────────────────────────────
    Route::prefix('invoices')->group(function () {
        Route::get('/export',      [BillingController::class, 'exportInvoices']);
        Route::get('/',            [BillingController::class, 'getInvoices']);
        Route::post('/',           [BillingController::class, 'createInvoice']);
        Route::get('/{id}',        [BillingController::class, 'showInvoice']);
        Route::post('/{id}/payments', [InvoiceReviewController::class, 'recordPayment']);

        // v2: Invoice Review Workflow
        Route::get('/review-queue',       [InvoiceReviewController::class, 'reviewQueue']);
        Route::get('/{id}/review',        [InvoiceReviewController::class, 'show']);
        Route::post('/{id}/lock',         [InvoiceReviewController::class, 'lock']);
        Route::post('/{id}/send-back',    [InvoiceReviewController::class, 'sendBack']);
        Route::post('/{id}/discount',     [InvoiceReviewController::class, 'applyDiscount']);
        Route::post('/{id}/insurance',    [InvoiceReviewController::class, 'applyInsurance']);
        Route::get('/{id}/pdf',           [\App\Http\Controllers\Api\V1\Receptionist\InvoicePdfController::class, 'download']);
    });

    // ── Insurance Claims ──────────────────────────────────────────────────────
    Route::prefix('claims')->group(function () {
        Route::get('/',              [BillingController::class, 'getClaims']);
        Route::post('/',             [BillingController::class, 'createClaim']);
        Route::put('/{id}/status',   [BillingController::class, 'updateClaimStatus']);
        Route::post('/{id}/documents',[BillingController::class, 'uploadClaimDocument']);
    });

    // ── Taxes ─────────────────────────────────────────────────────────────────
    Route::prefix('taxes')->group(function () {
        Route::get('/',        [BillingController::class, 'getTaxes']);
        Route::post('/{id}/pay', [BillingController::class, 'payTax']);
    });

    // ── Reports ───────────────────────────────────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::get('/types',                          [ReportController::class, 'getReportTypes']);
        Route::post('/generate',                      [ReportController::class, 'generateReport']);
        Route::get('/generated',                      [ReportController::class, 'getGeneratedReports']);
        Route::get('/{id}/download',                  [ReportController::class, 'downloadReport']);
        Route::get('/fiscal-years',                   [ReportController::class, 'getFiscalYears']);
        Route::post('/fiscal-years',                  [ReportController::class, 'createFiscalYear']);
        Route::get('/fiscal-years/{id}/periods',      [ReportController::class, 'getPeriods']);
        Route::post('/periods/{id}/close',            [ReportController::class, 'closePeriod']);
    });

    // ── Settings ──────────────────────────────────────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/profile',          [SettingsController::class, 'getProfile']);
        Route::put('/profile',          [SettingsController::class, 'updateProfile']);
        Route::post('/change-password', [SettingsController::class, 'changePassword']);
        Route::get('/clinic-info',      [SettingsController::class, 'getClinicInfo']);
        Route::get('/filters',          [SettingsController::class, 'getFilters']);
    });
});

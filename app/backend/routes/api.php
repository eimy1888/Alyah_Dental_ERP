<?php

use Illuminate\Support\Facades\Route;

// ── API version prefix ─────────────────────────────────────
Route::prefix('v1')->group(function () {

    // Auth (public)
    require __DIR__ . '/api/v1/auth.php';

    // Landing (public)
    require __DIR__ . '/api/v1/Landing.php';

    // Platform admin routes
   
        require __DIR__ . '/api/v1/platform.php';
  
    // Clinic admin routes
   
        require __DIR__ . '/api/v1/clinic.php';
   
    // Dentist routes  ← ADD THIS

        require __DIR__ . '/api/v1/dentist.php';

    // Manager routes  ← ADD THIS
        require __DIR__ . '/api/v1/manager.php';
        
    // Receptionist routes  ← ADD THIS
        require __DIR__ . '/api/v1/receptionist.php';

        // Accountant routes  ← ADD THIS
        require __DIR__ . '/api/v1/accountant.php';

    // Patient routes  ← ADD THIS
        require __DIR__ . '/api/v1/patient.php';

        // Public showcase routes (no auth)
    require __DIR__ . '/api/v1/public.php';

    // Lab Technician routes
    require __DIR__ . '/api/v1/lab.php';

    
});
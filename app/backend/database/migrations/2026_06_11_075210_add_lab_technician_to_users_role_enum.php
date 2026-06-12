<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('platform_admin','clinic_admin','branch_manager','dentist','receptionist','accountant','patient','lab_technician') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('platform_admin','clinic_admin','branch_manager','dentist','receptionist','accountant','patient') NOT NULL");
    }
};

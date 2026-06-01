<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remove o NOT NULL da coluna status (PostgreSQL)
        DB::statement('ALTER TABLE presencas ALTER COLUMN status DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE presencas ALTER COLUMN status SET NOT NULL');
    }
};

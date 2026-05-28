<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presencas', function (Blueprint $table) {
            // Second status: post-celebration result (serviu/faltou/substituido/justificado)
            // The existing 'status' column becomes the confirmation status
            // We rename existing 'status' → 'status_confirmacao' and add new 'status_presenca'
            $table->string('status_confirmacao')->nullable()->after('status');
            // Copy current status values to confirmacao
        });

        // Migrate existing data: if status = 'confirmado', keep it; else null
        \Illuminate\Support\Facades\DB::statement("
            UPDATE presencas SET status_confirmacao = CASE 
                WHEN status = 'confirmado' THEN 'confirmado' 
                ELSE NULL 
            END
        ");
    }

    public function down(): void
    {
        Schema::table('presencas', function (Blueprint $table) {
            $table->dropColumn('status_confirmacao');
        });
    }
};

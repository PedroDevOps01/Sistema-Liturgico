<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cerimoniario_competencias', function (Blueprint $table) {
            $table->unsignedBigInteger('concluido_por')->nullable()->after('observacao');
        });
    }

    public function down(): void
    {
        Schema::table('cerimoniario_competencias', function (Blueprint $table) {
            $table->dropColumn('concluido_por');
        });
    }
};

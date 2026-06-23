<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treinamentos', function (Blueprint $table) {
            $table->unsignedBigInteger('formacao_competencia_id')->nullable()->after('observacao');
        });
    }

    public function down(): void
    {
        Schema::table('treinamentos', function (Blueprint $table) {
            $table->dropColumn('formacao_competencia_id');
        });
    }
};

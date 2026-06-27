<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escalas', function (Blueprint $table) {
            $table->boolean('presenca_aberta')->default(false)->after('observacao');
            $table->timestamp('presenca_aberta_em')->nullable()->after('presenca_aberta');
            $table->timestamp('presenca_fechada_em')->nullable()->after('presenca_aberta_em');
        });
    }

    public function down(): void
    {
        Schema::table('escalas', function (Blueprint $table) {
            $table->dropColumn(['presenca_aberta', 'presenca_aberta_em', 'presenca_fechada_em']);
        });
    }
};

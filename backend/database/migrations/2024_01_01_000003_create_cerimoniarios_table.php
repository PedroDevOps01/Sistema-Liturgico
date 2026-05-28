<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cerimoniarios', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('numero')->nullable();
            $table->text('observacao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->boolean('disponivel_domingo_manha')->default(true);
            $table->boolean('disponivel_domingo_tarde')->default(true);
            $table->boolean('disponivel_domingo_noite')->default(true);
            $table->boolean('disponivel_semana_manha')->default(true);
            $table->boolean('disponivel_semana_tarde')->default(true);
            $table->boolean('disponivel_semana_noite')->default(true);
            $table->boolean('disponivel_sabado')->default(true);
            $table->boolean('indisponivel_temporario')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cerimoniarios');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treinamentos', function (Blueprint $table) {
            $table->id();
            $table->date('data');
            $table->time('horario');
            $table->string('tema');
            $table->string('local')->nullable();
            $table->json('funcoes')->nullable();
            $table->string('periodo_liturgico')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treinamentos');
    }
};

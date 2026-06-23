<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tunicas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->enum('tamanho', ['PP', 'P', 'M', 'G', 'GG']);
            $table->enum('cor', ['branca', 'vermelha', 'preta']);
            $table->enum('estado', ['novo', 'bom', 'regular', 'ruim']);
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tunicas');
    }
};

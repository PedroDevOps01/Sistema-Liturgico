<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treinamento_competencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('treinamento_id')
                ->constrained('treinamentos')
                ->cascadeOnDelete();
            $table->foreignId('formacao_competencia_id')
                ->constrained('formacao_competencias')
                ->cascadeOnDelete();
            $table->unique(['treinamento_id', 'formacao_competencia_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treinamento_competencias');
    }
};

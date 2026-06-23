<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cerimoniario_competencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios');
            $table->foreignId('formacao_competencia_id')->constrained('formacao_competencias')->cascadeOnDelete();
            $table->boolean('concluida')->default(false);
            $table->date('data_conclusao')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->unique(['cerimoniario_id', 'formacao_competencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cerimoniario_competencias');
    }
};

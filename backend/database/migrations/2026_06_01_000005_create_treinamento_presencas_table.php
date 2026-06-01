<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treinamento_presencas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('treinamento_id')->constrained('treinamentos')->cascadeOnDelete();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios');
            $table->enum('status', ['presente', 'ausente', 'justificado'])->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->unique(['treinamento_id', 'cerimoniario_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treinamento_presencas');
    }
};

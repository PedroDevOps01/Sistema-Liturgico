<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escala_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escala_id')->constrained('escalas')->cascadeOnDelete();
            $table->foreignId('cerimoniario_id')->nullable()->constrained('cerimoniarios')->nullOnDelete();
            $table->foreignId('funcao_id')->nullable()->constrained('funcoes')->nullOnDelete();
            $table->string('funcao_label')->nullable();
            $table->integer('ordem')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escala_itens');
    }
};

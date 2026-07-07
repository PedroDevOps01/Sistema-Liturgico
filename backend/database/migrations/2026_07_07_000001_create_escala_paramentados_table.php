<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escala_paramentados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escala_id')->constrained('escalas')->cascadeOnDelete();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['escala_id', 'cerimoniario_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escala_paramentados');
    }
};

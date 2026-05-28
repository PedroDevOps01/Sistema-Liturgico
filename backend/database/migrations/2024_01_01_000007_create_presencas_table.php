<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presencas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escala_item_id')->unique()->constrained('escala_itens')->cascadeOnDelete();
            $table->enum('status', ['confirmado', 'serviu', 'faltou', 'substituido', 'justificado']);
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presencas');
    }
};

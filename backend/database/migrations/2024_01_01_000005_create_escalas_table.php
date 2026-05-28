<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escalas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('celebracao_id')->constrained('celebracoes')->cascadeOnDelete();
            $table->foreignId('criado_por')->constrained('users');
            $table->foreignId('editado_por')->nullable()->constrained('users');
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalas');
    }
};

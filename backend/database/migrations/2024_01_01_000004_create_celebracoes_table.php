<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('celebracoes', function (Blueprint $table) {
            $table->id();
            $table->date('data');
            $table->time('horario');
            $table->string('periodo_liturgico');
            $table->integer('qtd_cerimoniarios')->default(1);
            $table->boolean('celebracao_noite')->default(false);
            $table->boolean('possui_bispo')->default(false);
            $table->boolean('celebracao_6h')->default(false);
            $table->boolean('celebracao_palavra')->default(false);
            $table->boolean('celebracao_solene')->default(false);
            $table->boolean('casamento')->default(false);
            $table->boolean('batismo')->default(false);
            $table->boolean('crisma')->default(false);
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('celebracoes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reunioes', function (Blueprint $table) {
            $table->id();
            $table->date('data');
            $table->time('horario');
            $table->string('tema');
            $table->string('local')->nullable();
            $table->string('tipo')->default('ordinaria'); // ordinaria, extraordinaria, formacao, planejamento, outra
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('reuniao_presencas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reuniao_id')->constrained('reunioes')->cascadeOnDelete();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios')->cascadeOnDelete();
            $table->string('status')->nullable(); // presente, ausente, justificado
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->unique(['reuniao_id', 'cerimoniario_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reuniao_presencas');
        Schema::dropIfExists('reunioes');
    }
};

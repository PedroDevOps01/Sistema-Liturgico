<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificacoes_enviadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cerimoniario_id')->nullable()->constrained()->nullOnDelete();
            $table->string('canal'); // whatsapp | email | portal
            $table->string('categoria'); // escala | aniversario | reuniao | treinamento | geral | administrativo
            $table->string('referencia_type')->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->string('destinatario')->nullable(); // snapshot do numero/e-mail usado
            $table->text('mensagem');
            $table->string('status'); // enviado | falhou
            $table->text('erro')->nullable();
            $table->timestamps();

            $table->index(['categoria', 'referencia_type', 'referencia_id', 'cerimoniario_id'], 'notif_dedup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacoes_enviadas');
    }
};

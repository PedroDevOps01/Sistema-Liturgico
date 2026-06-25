<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->string('tabela', 100)->index();
            $table->string('operacao', 20); // 'criou' | 'atualizou' | 'excluiu'
            $table->unsignedBigInteger('registro_id')->nullable();
            $table->jsonb('dados_antes')->nullable();
            $table->jsonb('dados_depois')->nullable();
            $table->unsignedBigInteger('usuario_id')->nullable();
            $table->string('usuario_nome', 150)->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            // sem updated_at — auditoria é imutável
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias');
    }
};

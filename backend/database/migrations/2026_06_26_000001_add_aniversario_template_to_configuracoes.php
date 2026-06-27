<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes', function (Blueprint $table) {
            $table->text('aniversario_mensagem_texto')->nullable()->after('portal_config');
            $table->longText('aniversario_mensagem_imagem')->nullable()->after('aniversario_mensagem_texto');
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes', function (Blueprint $table) {
            $table->dropColumn(['aniversario_mensagem_texto', 'aniversario_mensagem_imagem']);
        });
    }
};

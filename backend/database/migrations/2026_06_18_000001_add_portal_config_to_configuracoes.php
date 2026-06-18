<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes', function (Blueprint $table) {
            $table->json('portal_config')->nullable()->after('nome_coordenador');
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes', function (Blueprint $table) {
            $table->dropColumn('portal_config');
        });
    }
};

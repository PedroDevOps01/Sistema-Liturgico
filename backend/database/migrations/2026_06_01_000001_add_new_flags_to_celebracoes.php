<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->boolean('primeira_eucaristia')->default(false)->after('crisma');
            $table->boolean('adoracao_santissimo')->default(false)->after('primeira_eucaristia');
            $table->boolean('procissao')->default(false)->after('adoracao_santissimo');
            $table->boolean('via_sacra')->default(false)->after('procissao');
            $table->boolean('exequias')->default(false)->after('via_sacra');
            $table->boolean('vigilia_pascal')->default(false)->after('exequias');
            $table->boolean('paixao_senhor')->default(false)->after('vigilia_pascal');
            $table->boolean('ordenacao')->default(false)->after('paixao_senhor');
        });
    }

    public function down(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->dropColumn([
                'primeira_eucaristia',
                'adoracao_santissimo',
                'procissao',
                'via_sacra',
                'exequias',
                'vigilia_pascal',
                'paixao_senhor',
                'ordenacao',
            ]);
        });
    }
};

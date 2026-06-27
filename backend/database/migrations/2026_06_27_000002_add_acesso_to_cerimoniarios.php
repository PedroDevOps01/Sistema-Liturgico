<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cerimoniarios', function (Blueprint $table) {
            $table->string('usuario', 80)->unique()->nullable()->after('nome');
            $table->string('senha')->nullable()->after('usuario');
            $table->text('foto_base64')->nullable()->after('observacao');
        });
    }

    public function down(): void
    {
        Schema::table('cerimoniarios', function (Blueprint $table) {
            $table->dropColumn(['usuario', 'senha', 'foto_base64']);
        });
    }
};

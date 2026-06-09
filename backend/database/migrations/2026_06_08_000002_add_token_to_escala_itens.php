<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escala_itens', function (Blueprint $table) {
            $table->string('token_confirmacao', 64)->unique()->nullable()->after('ordem');
            $table->string('status_confirmacao', 20)->nullable()->after('token_confirmacao');
        });
    }

    public function down(): void
    {
        Schema::table('escala_itens', function (Blueprint $table) {
            $table->dropColumn(['token_confirmacao', 'status_confirmacao']);
        });
    }
};

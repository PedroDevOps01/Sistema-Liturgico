<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // celebracoes and escalas don't have ativo yet
        foreach (['celebracoes', 'escalas'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->boolean('ativo')->default(true)->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (['celebracoes', 'escalas'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('ativo');
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datas_bloqueadas', function (Blueprint $table) {
            $table->date('data_fim')->nullable()->after('data');
        });
    }

    public function down(): void
    {
        Schema::table('datas_bloqueadas', function (Blueprint $table) {
            $table->dropColumn('data_fim');
        });
    }
};

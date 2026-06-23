<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cerimoniarios', function (Blueprint $table) {
            $table->date('data_nascimento')->nullable()->after('observacao');
        });
    }

    public function down(): void
    {
        Schema::table('cerimoniarios', function (Blueprint $table) {
            $table->dropColumn('data_nascimento');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comunicados', function (Blueprint $table) {
            $table->foreignId('cerimoniario_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->string('categoria')->default('geral')->after('tipo');
            $table->string('canal')->default('portal')->after('categoria');
        });
    }

    public function down(): void
    {
        Schema::table('comunicados', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cerimoniario_id');
            $table->dropColumn(['categoria', 'canal']);
        });
    }
};

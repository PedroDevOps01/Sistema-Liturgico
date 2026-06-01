<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presencas', function (Blueprint $table) {
            $table->foreignId('substituto_id')
                ->nullable()
                ->after('observacao')
                ->constrained('cerimoniarios')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('presencas', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Cerimoniario::class, 'substituto_id');
            $table->dropColumn('substituto_id');
        });
    }
};

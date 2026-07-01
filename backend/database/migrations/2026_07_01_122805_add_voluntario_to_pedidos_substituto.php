<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('pedidos_substituto', function (Blueprint $table) {
            $table->foreignId('voluntario_cerimoniario_id')
                  ->nullable()
                  ->after('resolvido')
                  ->constrained('cerimoniarios')
                  ->nullOnDelete();
        });
    }

    public function down(): void {
        Schema::table('pedidos_substituto', function (Blueprint $table) {
            $table->dropForeign(['voluntario_cerimoniario_id']);
            $table->dropColumn('voluntario_cerimoniario_id');
        });
    }
};

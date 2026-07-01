<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('presencas', function (Blueprint $table) {
            $table->foreignId('original_cerimoniario_id')
                  ->nullable()
                  ->after('substituto_id')
                  ->constrained('cerimoniarios')
                  ->nullOnDelete();
        });
    }

    public function down(): void {
        Schema::table('presencas', function (Blueprint $table) {
            $table->dropForeign(['original_cerimoniario_id']);
            $table->dropColumn('original_cerimoniario_id');
        });
    }
};

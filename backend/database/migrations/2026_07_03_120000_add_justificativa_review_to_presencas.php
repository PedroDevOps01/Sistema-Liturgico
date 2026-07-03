<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('presencas', function (Blueprint $table) {
            $table->string('justificativa_status', 20)->nullable()->after('observacao');
            $table->timestamp('justificativa_analisada_em')->nullable()->after('justificativa_status');
            $table->foreignId('justificativa_analisada_por')
                  ->nullable()
                  ->after('justificativa_analisada_em')
                  ->constrained('users')
                  ->nullOnDelete();
        });
    }

    public function down(): void {
        Schema::table('presencas', function (Blueprint $table) {
            $table->dropForeign(['justificativa_analisada_por']);
            $table->dropColumn(['justificativa_status', 'justificativa_analisada_em', 'justificativa_analisada_por']);
        });
    }
};

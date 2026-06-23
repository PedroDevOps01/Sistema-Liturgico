<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tunica_emprestimos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tunica_id')->constrained('tunicas')->cascadeOnDelete();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios');
            $table->date('data_emprestimo');
            $table->date('data_devolucao_prevista')->nullable();
            $table->date('data_devolucao_real')->nullable();
            $table->enum('status', ['emprestada', 'devolvida', 'perdida'])->default('emprestada');
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tunica_emprestimos');
    }
};

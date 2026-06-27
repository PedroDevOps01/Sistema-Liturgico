<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('comunicados', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('corpo');
            $table->string('tipo')->default('info'); // info, aviso, urgente
            $table->boolean('ativo')->default(true);
            $table->timestamp('expira_em')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('comunicados'); }
};

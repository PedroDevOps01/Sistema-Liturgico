<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('datas_bloqueadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cerimoniario_id')->constrained('cerimoniarios')->cascadeOnDelete();
            $table->date('data');
            $table->string('motivo')->nullable();
            $table->timestamps();
            $table->unique(['cerimoniario_id', 'data']);
        });
    }
    public function down(): void { Schema::dropIfExists('datas_bloqueadas'); }
};

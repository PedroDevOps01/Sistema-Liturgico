<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('pedidos_substituto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escala_item_id')->constrained('escala_itens')->cascadeOnDelete();
            $table->text('motivo')->nullable();
            $table->boolean('resolvido')->default(false);
            $table->timestamps();
            $table->unique(['escala_item_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('pedidos_substituto'); }
};

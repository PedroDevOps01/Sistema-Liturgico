<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interessados', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('telefone', 30)->nullable();
            $table->string('email')->nullable();
            $table->text('mensagem')->nullable();
            $table->boolean('lido')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interessados');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->boolean('final_de_semana')->default(false)->after('crisma');
            $table->string('weekend_group_id', 20)->nullable()->after('final_de_semana');
        });
    }

    public function down(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->dropColumn(['final_de_semana', 'weekend_group_id']);
        });
    }
};

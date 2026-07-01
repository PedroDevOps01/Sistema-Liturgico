<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->boolean('quinta_eucaristica')->default(false)->after('primeira_eucaristia');
        });
    }

    public function down(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->dropColumn('quinta_eucaristica');
        });
    }
};

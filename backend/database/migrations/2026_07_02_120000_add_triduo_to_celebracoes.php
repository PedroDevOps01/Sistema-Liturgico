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
            $table->boolean('triduo')->default(false)->after('quinta_eucaristica');
        });
    }

    public function down(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->dropColumn('triduo');
        });
    }
};

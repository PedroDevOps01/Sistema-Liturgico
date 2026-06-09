<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->boolean('santa_missa')->default(false)->after('ordenacao');
            $table->boolean('missa_crismal')->default(false)->after('santa_missa');
            $table->boolean('corpus_christi')->default(false)->after('missa_crismal');
            $table->boolean('missa_pontifical')->default(false)->after('corpus_christi');
            $table->string('cor_liturgica')->nullable()->after('missa_pontifical');
        });
    }

    public function down(): void
    {
        Schema::table('celebracoes', function (Blueprint $table) {
            $table->dropColumn(['santa_missa', 'missa_crismal', 'corpus_christi', 'missa_pontifical', 'cor_liturgica']);
        });
    }
};

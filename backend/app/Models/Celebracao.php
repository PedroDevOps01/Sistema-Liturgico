<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Celebracao extends Model
{
    use SoftDeletes;

    protected $table = 'celebracoes';

    protected $fillable = [
        'ativo',
        'data',
        'horario',
        'periodo_liturgico',
        'qtd_cerimoniarios',
        'celebracao_noite',
        'possui_bispo',
        'celebracao_6h',
        'celebracao_palavra',
        'celebracao_solene',
        'casamento',
        'batismo',
        'crisma',
        'observacao',
        'final_de_semana',
        'weekend_group_id',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'celebracao_noite' => 'boolean',
            'possui_bispo' => 'boolean',
            'celebracao_6h' => 'boolean',
            'celebracao_palavra' => 'boolean',
            'celebracao_solene' => 'boolean',
            'casamento' => 'boolean',
            'batismo' => 'boolean',
            'crisma' => 'boolean',
            'final_de_semana' => 'boolean',
            'ativo' => 'boolean',
            'qtd_cerimoniarios' => 'integer',
        ];
    }

    public function escala(): HasOne
    {
        return $this->hasOne(Escala::class, 'celebracao_id');
    }
}

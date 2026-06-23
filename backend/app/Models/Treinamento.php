<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Treinamento extends Model
{
    use SoftDeletes;

    protected $table = 'treinamentos';

    protected $fillable = [
        'data',
        'horario',
        'tema',
        'local',
        'funcoes',
        'periodo_liturgico',
        'observacao',
        'formacao_competencia_id',
    ];

    protected function casts(): array
    {
        return [
            'data'    => 'date',
            'funcoes' => 'array',
        ];
    }

    public function presencas(): HasMany
    {
        return $this->hasMany(TreinamentoPresenca::class);
    }

    public function competencia(): BelongsTo
    {
        return $this->belongsTo(FormacaoCompetencia::class, 'formacao_competencia_id');
    }
}

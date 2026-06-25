<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Treinamento extends Model
{
    use SoftDeletes;
    use \App\Traits\Auditavel;

    protected $table = 'treinamentos';

    protected $fillable = [
        'data',
        'horario',
        'tema',
        'local',
        'funcoes',
        'periodo_liturgico',
        'observacao',
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

    public function competencias(): BelongsToMany
    {
        return $this->belongsToMany(
            FormacaoCompetencia::class,
            'treinamento_competencias',
            'treinamento_id',
            'formacao_competencia_id'
        );
    }
}

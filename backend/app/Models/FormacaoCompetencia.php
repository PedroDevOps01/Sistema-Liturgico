<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormacaoCompetencia extends Model
{
    protected $table = 'formacao_competencias';

    protected $fillable = [
        'formacao_nivel_id',
        'nome',
        'descricao',
        'obrigatoria',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'obrigatoria' => 'boolean',
        ];
    }

    public function nivel(): BelongsTo
    {
        return $this->belongsTo(FormacaoNivel::class, 'formacao_nivel_id');
    }

    public function cerimoniarioCompetencias(): HasMany
    {
        return $this->hasMany(CerimoniarioCompetencia::class, 'formacao_competencia_id');
    }
}

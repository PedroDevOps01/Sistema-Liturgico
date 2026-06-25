<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CerimoniarioCompetencia extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'cerimoniario_competencias';

    protected $fillable = [
        'cerimoniario_id',
        'formacao_competencia_id',
        'concluida',
        'data_conclusao',
        'observacao',
        'concluido_por',
    ];

    protected function casts(): array
    {
        return [
            'concluida'      => 'boolean',
            'data_conclusao' => 'date:Y-m-d',
        ];
    }

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }

    public function competencia(): BelongsTo
    {
        return $this->belongsTo(FormacaoCompetencia::class, 'formacao_competencia_id');
    }

    public function concluidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'concluido_por');
    }
}

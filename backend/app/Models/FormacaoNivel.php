<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormacaoNivel extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'formacao_niveis';

    protected $fillable = [
        'nome',
        'descricao',
        'ordem',
        'cor',
    ];

    public function competencias(): HasMany
    {
        return $this->hasMany(FormacaoCompetencia::class, 'formacao_nivel_id')->orderBy('ordem');
    }
}

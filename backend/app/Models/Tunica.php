<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tunica extends Model
{
    use SoftDeletes;
    use \App\Traits\Auditavel;

    protected $table = 'tunicas';

    protected $fillable = [
        'codigo',
        'tamanho',
        'cor',
        'estado',
        'observacao',
    ];

    public function emprestimos(): HasMany
    {
        return $this->hasMany(TunicaEmprestimo::class);
    }

    // HasOne → serializes as single object or null, not array
    // Inclui 'perdida' para que túnicas perdidas não apareçam como disponíveis
    public function emprestimoAtual(): HasOne
    {
        return $this->hasOne(TunicaEmprestimo::class)->whereIn('status', ['emprestada', 'perdida']);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TunicaEmprestimo extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'tunica_emprestimos';

    protected $fillable = [
        'tunica_id',
        'cerimoniario_id',
        'data_emprestimo',
        'data_devolucao_prevista',
        'data_devolucao_real',
        'status',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'data_emprestimo'         => 'date:Y-m-d',
            'data_devolucao_prevista' => 'date:Y-m-d',
            'data_devolucao_real'     => 'date:Y-m-d',
        ];
    }

    public function tunica(): BelongsTo
    {
        return $this->belongsTo(Tunica::class);
    }

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }
}

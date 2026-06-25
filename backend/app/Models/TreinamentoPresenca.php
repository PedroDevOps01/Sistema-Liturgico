<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreinamentoPresenca extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'treinamento_presencas';

    protected $fillable = [
        'treinamento_id',
        'cerimoniario_id',
        'status',
        'observacao',
    ];

    public function treinamento(): BelongsTo
    {
        return $this->belongsTo(Treinamento::class);
    }

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }
}

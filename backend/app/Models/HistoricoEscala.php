<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoricoEscala extends Model
{
    protected $table = 'historico_escalas';

    protected $fillable = [
        'escala_id',
        'user_id',
        'acao',
        'descricao',
    ];

    public function escala(): BelongsTo
    {
        return $this->belongsTo(Escala::class, 'escala_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

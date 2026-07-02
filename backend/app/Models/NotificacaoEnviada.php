<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificacaoEnviada extends Model
{
    protected $table = 'notificacoes_enviadas';

    protected $fillable = [
        'cerimoniario_id',
        'canal',
        'categoria',
        'referencia_type',
        'referencia_id',
        'destinatario',
        'mensagem',
        'status',
        'erro',
    ];

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }
}

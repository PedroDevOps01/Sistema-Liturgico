<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelatorioMensalStatus extends Model
{
    protected $table = 'relatorio_mensal_status';

    protected $fillable = ['user_id', 'mes', 'status'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

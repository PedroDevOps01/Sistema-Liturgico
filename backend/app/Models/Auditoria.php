<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Auditoria extends Model
{
    public $timestamps = false;

    protected $table = 'auditorias';

    protected $fillable = [
        'tabela',
        'operacao',
        'registro_id',
        'dados_antes',
        'dados_depois',
        'usuario_id',
        'usuario_nome',
        'ip',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'dados_antes'  => 'array',
            'dados_depois' => 'array',
            'created_at'   => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}

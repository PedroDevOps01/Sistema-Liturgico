<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EscalaItem extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'escala_itens';

    protected $fillable = [
        'escala_id',
        'cerimoniario_id',
        'funcao_id',
        'funcao_label',
        'ordem',
        'token_confirmacao',
        'status_confirmacao',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
        ];
    }

    public function escala(): BelongsTo
    {
        return $this->belongsTo(Escala::class, 'escala_id');
    }

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class, 'cerimoniario_id');
    }

    public function funcao(): BelongsTo
    {
        return $this->belongsTo(Funcao::class, 'funcao_id');
    }

    public function presenca(): HasOne
    {
        return $this->hasOne(Presenca::class, 'escala_item_id');
    }
}

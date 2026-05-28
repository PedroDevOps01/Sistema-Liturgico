<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Escala extends Model
{
    use SoftDeletes;

    protected $table = 'escalas';

    protected $fillable = [
        'celebracao_id',
        'criado_por',
        'editado_por',
        'observacao',
    ];

    public function celebracao(): BelongsTo
    {
        return $this->belongsTo(Celebracao::class, 'celebracao_id');
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'editado_por');
    }

    public function escalaItens(): HasMany
    {
        return $this->hasMany(EscalaItem::class, 'escala_id')->orderBy('ordem');
    }

    public function historicos(): HasMany
    {
        return $this->hasMany(HistoricoEscala::class, 'escala_id')->orderByDesc('created_at');
    }
}

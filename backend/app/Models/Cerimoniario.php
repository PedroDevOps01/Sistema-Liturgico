<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Cerimoniario extends Model
{
    use SoftDeletes;
    use \App\Traits\Auditavel;

    protected $table = 'cerimoniarios';

    protected $fillable = [
        'nome',
        'numero',
        'observacao',
        'data_nascimento',
        'ativo',
        'disponivel_domingo_manha',
        'disponivel_domingo_tarde',
        'disponivel_domingo_noite',
        'disponivel_semana_manha',
        'disponivel_semana_tarde',
        'disponivel_semana_noite',
        'disponivel_sabado',
        'indisponivel_temporario',
        'experiente',
        'mestre',
    ];

    protected function casts(): array
    {
        return [
            'data_nascimento' => 'date:Y-m-d',
            'ativo' => 'boolean',
            'disponivel_domingo_manha' => 'boolean',
            'disponivel_domingo_tarde' => 'boolean',
            'disponivel_domingo_noite' => 'boolean',
            'disponivel_semana_manha' => 'boolean',
            'disponivel_semana_tarde' => 'boolean',
            'disponivel_semana_noite' => 'boolean',
            'disponivel_sabado' => 'boolean',
            'indisponivel_temporario' => 'boolean',
            'experiente' => 'boolean',
            'mestre' => 'boolean',
        ];
    }

    public function escalaItens(): HasMany
    {
        return $this->hasMany(EscalaItem::class, 'cerimoniario_id');
    }

    public function presencas(): HasManyThrough
    {
        return $this->hasManyThrough(Presenca::class, EscalaItem::class, 'cerimoniario_id', 'escala_item_id');
    }
}

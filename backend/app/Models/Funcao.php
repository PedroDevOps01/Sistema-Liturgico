<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Funcao extends Model
{
    protected $table = 'funcoes';

    protected $fillable = [
        'titulo',
        'descricao',
        'ordem',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }

    public function escalaItens(): HasMany
    {
        return $this->hasMany(EscalaItem::class, 'funcao_id');
    }
}

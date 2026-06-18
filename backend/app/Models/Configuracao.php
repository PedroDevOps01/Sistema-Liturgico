<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Configuracao extends Model
{
    protected $table = 'configuracoes';

    protected $fillable = [
        'nome_paroquia',
        'logo_base64',
        'endereco',
        'telefone',
        'nome_coordenador',
        'portal_config',
    ];

    protected $casts = [
        'portal_config' => 'array',
    ];
}

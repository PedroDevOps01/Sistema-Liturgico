<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Configuracao extends Model
{
    protected $table = 'configuracoes';

    protected $fillable = [
        'nome_paroquia',
        'logo_base64',
        'logo_ministerio_base64',
        'endereco',
        'telefone',
        'nome_coordenador',
        'portal_config',
        'aniversario_mensagem_texto',
        'aniversario_mensagem_imagem',
    ];

    protected $casts = [
        'portal_config' => 'array',
    ];
}

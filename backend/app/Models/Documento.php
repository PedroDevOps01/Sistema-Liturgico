<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Documento extends Model {
    protected $fillable = ['titulo', 'descricao', 'tipo', 'arquivo_nome', 'arquivo_base64', 'mime_type', 'ativo', 'conteudo_estruturado'];
    protected $casts = ['ativo' => 'boolean', 'conteudo_estruturado' => 'array'];
    protected $hidden = ['arquivo_base64'];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Interessado extends Model
{
    protected $fillable = ['nome', 'telefone', 'email', 'mensagem', 'lido'];

    protected function casts(): array
    {
        return ['lido' => 'boolean'];
    }
}

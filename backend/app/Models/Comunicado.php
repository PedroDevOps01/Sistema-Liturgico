<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Comunicado extends Model {
    protected $fillable = ['titulo', 'corpo', 'tipo', 'ativo', 'expira_em'];
    protected $casts = ['ativo' => 'boolean', 'expira_em' => 'datetime'];
}

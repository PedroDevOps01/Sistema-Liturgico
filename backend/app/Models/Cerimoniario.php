<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Laravel\Sanctum\HasApiTokens;

class Cerimoniario extends Authenticatable
{
    use HasApiTokens, SoftDeletes;
    use \App\Traits\Auditavel;

    protected $table = 'cerimoniarios';

    protected $hidden = ['senha'];

    protected $fillable = [
        'nome',
        'usuario',
        'senha',
        'foto_base64',
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

    public function getAuthPasswordName(): string { return 'senha'; }
    public function getAuthPassword(): string { return $this->senha ?? ''; }

    /** Gera um slug único de usuário a partir do nome. */
    public static function gerarUsuario(string $nome): string
    {
        $partes = preg_split('/\s+/', trim($nome));
        $partes = array_values(array_filter($partes, fn($p) => mb_strlen($p) > 2));
        if (empty($partes)) $partes = preg_split('/\s+/', trim($nome));

        $slug = implode('.', array_map(fn($p) => static::normalizar($p), $partes));
        $base = $slug; $i = 1;
        while (static::withTrashed()->where('usuario', $slug)->exists()) {
            $slug = $base . $i++;
        }
        return $slug;
    }

    private static function normalizar(string $s): string
    {
        $map = ['á'=>'a','à'=>'a','ã'=>'a','â'=>'a','é'=>'e','ê'=>'e','í'=>'i',
                'ó'=>'o','ô'=>'o','õ'=>'o','ú'=>'u','ç'=>'c','ä'=>'a','ö'=>'o','ü'=>'u'];
        $s = mb_strtolower($s);
        $s = strtr($s, $map);
        return preg_replace('/[^a-z0-9]/', '', $s);
    }

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

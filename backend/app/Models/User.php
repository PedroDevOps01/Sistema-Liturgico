<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    protected $fillable = [
        'nome',
        'usuario',
        'password',
        'ativo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Custom username field for authentication.
     */
    public string $username = 'usuario';

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ativo' => 'boolean',
        ];
    }
}

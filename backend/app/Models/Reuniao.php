<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reuniao extends Model
{
    use SoftDeletes;
    use \App\Traits\Auditavel;

    protected $table = 'reunioes';

    protected $fillable = [
        'data',
        'horario',
        'tema',
        'local',
        'tipo',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
        ];
    }

    public function presencas(): HasMany
    {
        return $this->hasMany(ReuniaoPresenca::class);
    }
}

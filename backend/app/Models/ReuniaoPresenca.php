<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReuniaoPresenca extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'reuniao_presencas';

    protected $fillable = [
        'reuniao_id',
        'cerimoniario_id',
        'status',
        'observacao',
    ];

    public function reuniao(): BelongsTo
    {
        return $this->belongsTo(Reuniao::class);
    }

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }
}

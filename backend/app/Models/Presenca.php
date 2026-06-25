<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presenca extends Model
{
    use \App\Traits\Auditavel;

    protected $table = 'presencas';

    protected $fillable = [
        'escala_item_id',
        'status',
        'status_confirmacao',
        'observacao',
        'substituto_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public function escalaItem(): BelongsTo
    {
        return $this->belongsTo(EscalaItem::class, 'escala_item_id');
    }

    public function substituto(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class, 'substituto_id');
    }
}

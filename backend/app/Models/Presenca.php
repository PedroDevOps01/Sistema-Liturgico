<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presenca extends Model
{
    protected $table = 'presencas';

    protected $fillable = [
        'escala_item_id',
        'status',
        'observacao',
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
}

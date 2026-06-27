<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoSubstituto extends Model {
    protected $table = 'pedidos_substituto';
    protected $fillable = ['escala_item_id', 'motivo', 'resolvido'];
    protected $casts = ['resolvido' => 'boolean'];
    public function escalaItem(): BelongsTo { return $this->belongsTo(EscalaItem::class); }
}

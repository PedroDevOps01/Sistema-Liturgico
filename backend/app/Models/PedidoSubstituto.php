<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoSubstituto extends Model {
    protected $table = 'pedidos_substituto';
    protected $fillable = ['escala_item_id', 'motivo', 'resolvido', 'voluntario_cerimoniario_id'];
    protected $casts = ['resolvido' => 'boolean'];
    public function escalaItem(): BelongsTo { return $this->belongsTo(EscalaItem::class); }
    public function voluntario(): BelongsTo { return $this->belongsTo(Cerimoniario::class, 'voluntario_cerimoniario_id'); }
}

<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comunicado extends Model {
    protected $fillable = ['titulo', 'corpo', 'tipo', 'ativo', 'expira_em', 'cerimoniario_id', 'categoria', 'canal'];
    protected $casts = ['ativo' => 'boolean', 'expira_em' => 'datetime'];

    public function cerimoniario(): BelongsTo
    {
        return $this->belongsTo(Cerimoniario::class);
    }
}

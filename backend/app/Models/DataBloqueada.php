<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataBloqueada extends Model {
    protected $table = 'datas_bloqueadas';
    protected $fillable = ['cerimoniario_id', 'data', 'motivo'];
    protected $casts = ['data' => 'date'];
    public function cerimoniario(): BelongsTo { return $this->belongsTo(Cerimoniario::class); }
}

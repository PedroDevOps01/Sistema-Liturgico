<?php

namespace App\Traits;

use App\Models\Auditoria;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait Auditavel
{
    public static function bootAuditavel(): void
    {
        static::created(function ($model) {
            static::registrarAuditoria($model, 'criou', null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $dirty = $model->getDirty();
            // Ignora quando só deleted_at mudou (soft-delete dispara updated antes de deleted)
            if (array_diff(array_keys($dirty), ['deleted_at', 'updated_at']) === []) return;

            static::registrarAuditoria($model, 'atualizou', $model->getOriginal(), $model->getAttributes());
        });

        static::deleted(function ($model) {
            static::registrarAuditoria($model, 'excluiu', $model->getAttributes(), null);
        });
    }

    private static function registrarAuditoria($model, string $operacao, ?array $antes, ?array $depois): void
    {
        try {
            Auditoria::create([
                'tabela'       => $model->getTable(),
                'operacao'     => $operacao,
                'registro_id'  => $model->getKey(),
                'dados_antes'  => $antes,
                'dados_depois' => $depois,
                'usuario_id'   => Auth::id(),
                'usuario_nome' => Auth::user()?->nome ?? null,
                'ip'           => Request::ip(),
                'created_at'   => now(),
            ]);
        } catch (\Throwable) {
            // Nunca deixar falha de auditoria impedir a operação principal
        }
    }
}

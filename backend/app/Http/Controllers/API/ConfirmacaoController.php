<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EscalaItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfirmacaoController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $item = EscalaItem::where('token_confirmacao', $token)
            ->with(['cerimoniario', 'escala.celebracao', 'funcao'])
            ->firstOrFail();

        $cel     = $item->escala->celebracao;
        $horario = substr($cel->horario, 0, 5);
        $data    = \Carbon\Carbon::parse($cel->data)->format('d/m/Y');
        $funcao  = $item->funcao_label ?? ($item->funcao?->titulo ?? 'Função');

        return response()->json([
            'data' => [
                'cerimoniario'       => $item->cerimoniario?->nome ?? 'Acólito',
                'funcao'             => $funcao,
                'data'               => $data,
                'horario'            => $horario,
                'periodo_liturgico'  => $cel->periodo_liturgico,
                'status_confirmacao' => $item->status_confirmacao,
            ],
        ]);
    }

    public function update(string $token, Request $request): JsonResponse
    {
        $request->validate(['acao' => 'required|in:confirmar,recusar']);

        $item   = EscalaItem::where('token_confirmacao', $token)->firstOrFail();
        $status = $request->acao === 'confirmar' ? 'confirmado' : 'recusado';

        $item->update(['status_confirmacao' => $status]);

        return response()->json([
            'data'    => ['status_confirmacao' => $status],
            'message' => $status === 'confirmado' ? 'Presença confirmada!' : 'Recusa registrada.',
        ]);
    }
}

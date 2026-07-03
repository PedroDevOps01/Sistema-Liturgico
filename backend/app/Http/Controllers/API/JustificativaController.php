<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Presenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JustificativaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pendente');

        $query = Presenca::with([
            'escalaItem.cerimoniario:id,nome,foto_base64',
            'escalaItem.funcao:id,titulo',
            'escalaItem.escala.celebracao',
            'analisadoPor:id,nome',
        ])->whereNotNull('justificativa_status');

        if ($status !== 'todas') {
            $query->where('justificativa_status', $status);
        }

        $justificativas = $query->orderByDesc('updated_at')->get();

        return response()->json([
            'data'    => $justificativas,
            'message' => 'Justificativas.',
        ]);
    }

    public function aprovar(Request $request, Presenca $presenca): JsonResponse
    {
        $presenca->update([
            'status'                      => 'justificado',
            'justificativa_status'        => 'aprovada',
            'justificativa_analisada_em'  => now(),
            'justificativa_analisada_por' => $request->user()?->id,
        ]);

        return response()->json([
            'data'    => $presenca->fresh(['analisadoPor:id,nome']),
            'message' => 'Justificativa aprovada.',
        ]);
    }

    public function rejeitar(Request $request, Presenca $presenca): JsonResponse
    {
        $presenca->update([
            'status'                      => 'faltou',
            'justificativa_status'        => 'rejeitada',
            'justificativa_analisada_em'  => now(),
            'justificativa_analisada_por' => $request->user()?->id,
        ]);

        return response()->json([
            'data'    => $presenca->fresh(['analisadoPor:id,nome']),
            'message' => 'Justificativa rejeitada — falta mantida.',
        ]);
    }
}

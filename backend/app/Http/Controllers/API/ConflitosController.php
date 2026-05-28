<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Celebracao;
use App\Models\EscalaItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConflitosController extends Controller
{
    public function verificar(Request $request): JsonResponse
    {
        $request->validate([
            'cerimoniario_id' => 'required|exists:cerimoniarios,id',
            'celebracao_id' => 'required|exists:celebracoes,id',
        ]);

        $cerimoniario = Cerimoniario::findOrFail($request->cerimoniario_id);
        $celebracao = Celebracao::findOrFail($request->celebracao_id);

        $conflitos = [];

        // Check if cerimoniario is already in the same celebration
        $mesmaEscala = EscalaItem::whereHas('escala', fn ($q) => $q->where('celebracao_id', $celebracao->id))
            ->where('cerimoniario_id', $cerimoniario->id)
            ->exists();

        if ($mesmaEscala) {
            $conflitos[] = [
                'tipo' => 'duplicado',
                'descricao' => 'Cerimoniário já está escalado nesta celebração.',
            ];
        }

        // Check nearby celebrations (same day, overlapping time)
        $celebracoesNoMesmoDia = Celebracao::where('data', $celebracao->data)
            ->where('id', '!=', $celebracao->id)
            ->whereHas('escala.escalaItens', fn ($q) => $q->where('cerimoniario_id', $cerimoniario->id))
            ->with('escala')
            ->get();

        foreach ($celebracoesNoMesmoDia as $outra) {
            $conflitos[] = [
                'tipo' => 'mesmo_dia',
                'descricao' => "Cerimoniário já está escalado no mesmo dia às {$outra->horario}.",
                'celebracao' => $outra,
            ];
        }

        $temConflito = count($conflitos) > 0;

        return response()->json([
            'data' => [
                'cerimoniario' => $cerimoniario,
                'celebracao' => $celebracao,
                'tem_conflito' => $temConflito,
                'conflitos' => $conflitos,
            ],
            'message' => $temConflito ? 'Conflitos encontrados.' : 'Nenhum conflito encontrado.',
        ]);
    }
}

<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Escala;
use App\Models\EscalaItem;
use App\Models\Presenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ControlePresencaController extends Controller
{
    /**
     * Mestre abre a janela de presença após a celebração.
     */
    public function abrir(Escala $escala): JsonResponse
    {
        $escala->update([
            'presenca_aberta'     => true,
            'presenca_aberta_em'  => now(),
            'presenca_fechada_em' => null,
        ]);

        return response()->json([
            'data'    => $escala->fresh(),
            'message' => 'Janela de presença aberta. Os cerimoniários já podem registrar a presença.',
        ]);
    }

    /**
     * Mestre fecha a janela — quem não respondeu recebe falta automática.
     */
    public function fechar(Escala $escala): JsonResponse
    {
        $escala->load('itens');

        foreach ($escala->itens as $item) {
            if (! $item->cerimoniario_id) continue;

            $presenca = $item->presenca;

            // Só aplica falta automática se ainda não tem status registrado
            if (! $presenca || ! $presenca->status) {
                Presenca::updateOrCreate(
                    ['escala_item_id' => $item->id],
                    ['status' => 'faltou']
                );
            }
        }

        $escala->update([
            'presenca_aberta'     => false,
            'presenca_fechada_em' => now(),
        ]);

        return response()->json([
            'data'    => $escala->fresh(),
            'message' => 'Janela de presença fechada. Faltas automáticas aplicadas.',
        ]);
    }

    /**
     * Mestre substitui o cerimoniário de um item da escala.
     * Limpa o registro de presença anterior para o novo membro poder registrar.
     */
    public function substituir(Request $request, EscalaItem $item): JsonResponse
    {
        $validated = $request->validate([
            'cerimoniario_id' => 'nullable|exists:cerimoniarios,id',
        ]);

        // Apaga a presença existente — o novo cerimoniário começa do zero
        if ($item->cerimoniario_id && $item->cerimoniario_id !== $validated['cerimoniario_id']) {
            Presenca::where('escala_item_id', $item->id)->delete();
        }

        $item->update(['cerimoniario_id' => $validated['cerimoniario_id']]);
        $item->load('cerimoniario', 'funcao', 'presenca.substituto');

        return response()->json([
            'data'    => $item,
            'message' => 'Cerimoniário substituído com sucesso.',
        ]);
    }

    /**
     * Membro registra a própria presença (usado no portal do membro).
     * Só funciona enquanto a janela estiver aberta.
     */
    public function marcarMembro(Request $request, EscalaItem $item): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:serviu,justificado',
        ]);

        $escala = $item->escala;

        if (! $escala->presenca_aberta) {
            return response()->json([
                'message' => 'A janela de presença não está aberta.',
            ], 422);
        }

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            ['status' => $validated['status']]
        );

        return response()->json([
            'data'    => $presenca,
            'message' => 'Presença registrada com sucesso.',
        ]);
    }
}

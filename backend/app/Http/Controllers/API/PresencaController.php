<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EscalaItem;
use App\Models\Presenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresencaController extends Controller
{
    public function update(Request $request, EscalaItem $item): JsonResponse
    {
        $validated = $request->validate([
            'status'              => 'nullable|in:confirmado,serviu,faltou,substituido,justificado',
            'status_confirmacao'  => 'nullable|in:confirmado',
            'observacao'          => 'nullable|string',
            'substituto_id'       => 'nullable|exists:cerimoniarios,id',
        ]);

        $data = [];

        if (array_key_exists('status', $validated)) {
            $data['status'] = $validated['status'];
            // Limpa o substituto quando o status muda para algo diferente de substituido
            if ($validated['status'] !== 'substituido') {
                $data['substituto_id'] = null;
            }
        }
        if (array_key_exists('status_confirmacao', $validated)) {
            $data['status_confirmacao'] = $validated['status_confirmacao'];
        }
        if (array_key_exists('observacao', $validated) && $validated['observacao'] !== null) {
            $data['observacao'] = $validated['observacao'];
        }
        if (array_key_exists('substituto_id', $validated)) {
            $data['substituto_id'] = $validated['substituto_id'];
        }

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            $data
        );

        $presenca->load('substituto');

        return response()->json([
            'data'    => $presenca,
            'message' => 'Presença registrada com sucesso.',
        ]);
    }
}

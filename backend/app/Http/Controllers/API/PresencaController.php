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
        ]);

        // Allow clearing a status by passing null
        $data = array_filter([
            'status'             => $validated['status']             ?? null,
            'status_confirmacao' => $validated['status_confirmacao'] ?? null,
            'observacao'         => $validated['observacao']         ?? null,
        ], fn ($v) => $v !== null);

        // Use key existence to know if the field was sent
        if (array_key_exists('status', $validated)) {
            $data['status'] = $validated['status'];
        }
        if (array_key_exists('status_confirmacao', $validated)) {
            $data['status_confirmacao'] = $validated['status_confirmacao'];
        }

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            $data
        );

        return response()->json([
            'data'    => $presenca,
            'message' => 'Presença registrada com sucesso.',
        ]);
    }
}

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
            'status' => 'required|in:confirmado,serviu,faltou,substituido,justificado',
            'observacao' => 'nullable|string',
        ]);

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            $validated
        );

        return response()->json([
            'data' => $presenca,
            'message' => 'Presença registrada com sucesso.',
        ]);
    }
}

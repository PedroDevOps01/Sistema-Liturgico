<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Interessado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InteressadoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'     => 'required|string|max:255',
            'telefone' => 'nullable|string|max:30',
            'email'    => 'nullable|email|max:255',
            'mensagem' => 'nullable|string|max:1000',
        ]);

        Interessado::create($validated);

        return response()->json([
            'data'    => null,
            'message' => 'Interesse registrado com sucesso!',
        ], 201);
    }

    public function index(): JsonResponse
    {
        $interessados = Interessado::orderByRaw('lido ASC, created_at DESC')->get();
        $naoLidos     = Interessado::where('lido', false)->count();

        return response()->json([
            'data'      => $interessados,
            'nao_lidos' => $naoLidos,
            'message'   => 'Interessados carregados.',
        ]);
    }

    public function marcarLido(Interessado $interessado): JsonResponse
    {
        $interessado->update(['lido' => ! $interessado->lido]);

        return response()->json([
            'data'    => $interessado->fresh(),
            'message' => 'Status atualizado.',
        ]);
    }

    public function destroy(Interessado $interessado): JsonResponse
    {
        $interessado->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Removido com sucesso.',
        ]);
    }
}

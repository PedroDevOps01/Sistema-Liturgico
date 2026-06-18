<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Configuracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracaoController extends Controller
{
    private function getOrCreate(): Configuracao
    {
        return Configuracao::first() ?? Configuracao::create(['nome_paroquia' => 'Paróquia']);
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->getOrCreate(),
            'message' => 'Configuração carregada com sucesso.',
        ]);
    }

    public function showPortalConfig(): JsonResponse
    {
        $cfg = $this->getOrCreate();
        return response()->json([
            'data' => $cfg->portal_config,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome_paroquia'   => 'sometimes|string|max:255',
            'logo_base64'     => 'nullable|string',
            'endereco'        => 'nullable|string',
            'telefone'        => 'nullable|string|max:50',
            'nome_coordenador'=> 'nullable|string|max:255',
            'portal_config'   => 'nullable|array',
        ]);

        $configuracao = $this->getOrCreate();
        $configuracao->update($validated);

        return response()->json([
            'data' => $configuracao->fresh(),
            'message' => 'Configuração atualizada com sucesso.',
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo_base64' => 'nullable|string',
        ]);

        $configuracao = $this->getOrCreate();
        $configuracao->update(['logo_base64' => $request->logo_base64]);

        $msg = $request->logo_base64 ? 'Logo salvo com sucesso.' : 'Logo removido com sucesso.';

        return response()->json([
            'data' => ['logo_base64' => $request->logo_base64],
            'message' => $msg,
        ]);
    }
}

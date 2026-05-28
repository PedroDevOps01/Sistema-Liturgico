<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Funcao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Funcao::orderBy('ordem');

        if ($request->has('ativo')) {
            $query->where('ativo', filter_var($request->ativo, FILTER_VALIDATE_BOOLEAN));
        }

        $funcoes = $query->get();

        return response()->json([
            'data' => $funcoes,
            'message' => 'Funções listadas com sucesso.',
        ]);
    }
}

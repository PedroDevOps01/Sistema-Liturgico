<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $de       = $request->input('de');
        $ate      = $request->input('ate');
        $tabela   = $request->input('tabela');
        $operacao = $request->input('operacao');

        $q = Auditoria::query()->orderByDesc('created_at');

        if ($de)       $q->whereDate('created_at', '>=', $de);
        if ($ate)      $q->whereDate('created_at', '<=', $ate);
        if ($tabela)   $q->where('tabela', $tabela);
        if ($operacao) $q->where('operacao', $operacao);

        $resultado = $q->paginate(50)->withQueryString();

        return response()->json($resultado);
    }

    public function tabelas(): JsonResponse
    {
        $tabelas = DB::table('auditorias')
            ->select('tabela')
            ->distinct()
            ->orderBy('tabela')
            ->pluck('tabela');

        return response()->json($tabelas);
    }
}

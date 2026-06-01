<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\EscalaItem;
use App\Models\Presenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstatisticasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $anoAtual = now()->year;
        $mesAtual = now()->month;

        // Quem mais serviu (total de escalas como serviu)
        $quemMaisServiu = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id', '=', 'p.escala_item_id')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('cerimoniarios as c', 'c.id', '=', 'ei.cerimoniario_id')
            ->where('p.status', 'serviu')
            ->where('e.ativo', true)
            ->select('c.id', 'c.nome', DB::raw('COUNT(*) as total'))
            ->groupBy('c.id', 'c.nome')
            ->orderByDesc('total')
            ->take(10)
            ->get();

        // Participações mensais (escalados por mês no ano atual)
        $participacoesMensais = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereYear('cel.data', $anoAtual)
            ->select(
                DB::raw('EXTRACT(MONTH FROM cel.data) as mes'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy(DB::raw('EXTRACT(MONTH FROM cel.data)'))
            ->orderBy('mes')
            ->get();

        // Faltas por cerimoniário
        $faltas = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id', '=', 'p.escala_item_id')
            ->join('cerimoniarios as c', 'c.id', '=', 'ei.cerimoniario_id')
            ->where('p.status', 'faltou')
            ->select('c.id', 'c.nome', DB::raw('COUNT(*) as total'))
            ->groupBy('c.id', 'c.nome')
            ->orderByDesc('total')
            ->take(10)
            ->get();

        // Total de participações por cerimoniário (ano atual)
        $participacoesPorCerimoniario = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->join('cerimoniarios as c', 'c.id', '=', 'ei.cerimoniario_id')
            ->whereYear('cel.data', $anoAtual)
            ->select('c.id', 'c.nome', DB::raw('COUNT(*) as total'))
            ->groupBy('c.id', 'c.nome')
            ->orderByDesc('total')
            ->get();

        // Status summary
        $statusResumo = DB::table('presencas')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->get();

        return response()->json([
            'data' => [
                'quem_mais_serviu' => $quemMaisServiu,
                'participacoes_mensais' => $participacoesMensais,
                'faltas' => $faltas,
                'participacoes_por_cerimoniario' => $participacoesPorCerimoniario,
                'status_resumo' => $statusResumo,
                'ano' => $anoAtual,
            ],
            'message' => 'Estatísticas carregadas com sucesso.',
        ]);
    }
}

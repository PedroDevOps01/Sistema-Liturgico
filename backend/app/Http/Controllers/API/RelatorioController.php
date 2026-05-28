<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    public function presencas(Request $request): JsonResponse
    {
        $request->validate([
            'data_inicio' => 'nullable|date',
            'data_fim'    => 'nullable|date',
        ]);

        $inicio = $request->data_inicio ?? now()->startOfMonth()->toDateString();
        $fim    = $request->data_fim    ?? now()->endOfMonth()->toDateString();

        // ── Totais gerais ──────────────────────────────────────────────
        $totais = DB::table('escala_itens as ei')
            ->join('escalas as e',     'e.id',  '=', 'ei.escala_id')
            ->join('celebracoes as c', 'c.id',  '=', 'e.celebracao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)
            ->where('e.ativo', true)
            ->selectRaw("
                COUNT(*) as total_escalados,
                COUNT(CASE WHEN p.status = 'serviu'      THEN 1 END) as serviu,
                COUNT(CASE WHEN p.status = 'faltou'      THEN 1 END) as faltou,
                COUNT(CASE WHEN p.status = 'substituido' THEN 1 END) as substituido,
                COUNT(CASE WHEN p.status = 'justificado' THEN 1 END) as justificado,
                COUNT(CASE WHEN p.status = 'confirmado'  THEN 1 END) as confirmado,
                COUNT(CASE WHEN p.id IS NULL             THEN 1 END) as sem_registro
            ")
            ->first();

        // ── Por cerimoniário ───────────────────────────────────────────
        $porCerimoniario = DB::table('escala_itens as ei')
            ->join('escalas as e',       'e.id',  '=', 'ei.escala_id')
            ->join('celebracoes as c',   'c.id',  '=', 'e.celebracao_id')
            ->join('cerimoniarios as cr','cr.id', '=', 'ei.cerimoniario_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)
            ->where('e.ativo', true)
            ->groupBy('cr.id', 'cr.nome')
            ->selectRaw("
                cr.id,
                cr.nome,
                COUNT(*)                                              as total,
                COUNT(CASE WHEN p.status = 'serviu'      THEN 1 END) as serviu,
                COUNT(CASE WHEN p.status = 'faltou'      THEN 1 END) as faltou,
                COUNT(CASE WHEN p.status = 'substituido' THEN 1 END) as substituido,
                COUNT(CASE WHEN p.status = 'justificado' THEN 1 END) as justificado,
                COUNT(CASE WHEN p.status = 'confirmado'  THEN 1 END) as confirmado,
                COUNT(CASE WHEN p.id IS NULL             THEN 1 END) as sem_registro
            ")
            ->orderByRaw('serviu DESC, total DESC')
            ->get();

        // ── Por celebração ─────────────────────────────────────────────
        $porCelebracao = DB::table('escala_itens as ei')
            ->join('escalas as e',     'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as c', 'c.id', '=', 'e.celebracao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)
            ->where('e.ativo', true)
            ->groupBy('c.id', 'c.data', 'c.horario', 'c.periodo_liturgico', 'e.id')
            ->selectRaw("
                c.id as celebracao_id,
                c.data,
                c.horario,
                c.periodo_liturgico,
                e.id as escala_id,
                COUNT(*)                                              as total,
                COUNT(CASE WHEN p.status = 'serviu'      THEN 1 END) as serviu,
                COUNT(CASE WHEN p.status = 'faltou'      THEN 1 END) as faltou,
                COUNT(CASE WHEN p.status = 'substituido' THEN 1 END) as substituido,
                COUNT(CASE WHEN p.status = 'justificado' THEN 1 END) as justificado,
                COUNT(CASE WHEN p.status = 'confirmado'  THEN 1 END) as confirmado,
                COUNT(CASE WHEN p.id IS NULL             THEN 1 END) as sem_registro
            ")
            ->orderBy('c.data')
            ->orderBy('c.horario')
            ->get();

        // ── Top faltas (cerimoniários que mais faltam) ─────────────────
        $topFaltas = $porCerimoniario
            ->where('faltou', '>', 0)
            ->sortByDesc('faltou')
            ->take(5)
            ->values();

        // ── Top presença ───────────────────────────────────────────────
        $topPresenca = $porCerimoniario
            ->where('serviu', '>', 0)
            ->sortByDesc('serviu')
            ->take(5)
            ->values();

        return response()->json([
            'data' => [
                'periodo'          => ['inicio' => $inicio, 'fim' => $fim],
                'totais'           => $totais,
                'por_cerimoniario' => $porCerimoniario->values(),
                'por_celebracao'   => $porCelebracao,
                'top_faltas'       => $topFaltas,
                'top_presenca'     => $topPresenca,
            ],
            'message' => 'Relatório gerado com sucesso.',
        ]);
    }
}

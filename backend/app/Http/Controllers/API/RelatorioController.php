<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    private static function labelMes(string $mesStr): string
    {
        static $meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        [$ano, $mes] = explode('-', $mesStr);
        return $meses[(int)$mes - 1] . ' ' . $ano;
    }

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

        // ── Substituições detalhadas ────────────────────────────────────
        $substituicoes = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id', '=', 'p.escala_item_id')
            ->join('escalas as e',       'e.id',  '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->join('cerimoniarios as c_orig', 'c_orig.id', '=', 'ei.cerimoniario_id')
            ->leftJoin('cerimoniarios as c_sub', 'c_sub.id', '=', 'p.substituto_id')
            ->where('p.status', 'substituido')
            ->whereBetween('cel.data', [$inicio, $fim])
            ->where('cel.ativo', true)
            ->where('e.ativo', true)
            ->whereNull('cel.deleted_at')
            ->whereNull('e.deleted_at')
            ->select(
                'cel.data',
                'cel.horario',
                'cel.periodo_liturgico',
                'e.id as escala_id',
                'c_orig.id as cerimoniario_id',
                'c_orig.nome as cerimoniario_nome',
                'c_sub.id as substituto_id',
                'c_sub.nome as substituto_nome',
                DB::raw("COALESCE(ei.funcao_label, 'Função') as funcao")
            )
            ->orderByDesc('cel.data')
            ->orderBy('cel.horario')
            ->get();

        return response()->json([
            'data' => [
                'periodo'          => ['inicio' => $inicio, 'fim' => $fim],
                'totais'           => $totais,
                'por_cerimoniario' => $porCerimoniario->values(),
                'por_celebracao'   => $porCelebracao,
                'top_faltas'       => $topFaltas,
                'top_presenca'     => $topPresenca,
                'substituicoes'    => $substituicoes,
            ],
            'message' => 'Relatório gerado com sucesso.',
        ]);
    }

    public function frequencia(Request $request, int $cerimoniarioId): JsonResponse
    {
        $cerimoniario = Cerimoniario::findOrFail($cerimoniarioId);

        $request->validate([
            'de'  => 'nullable|date',
            'ate' => 'nullable|date',
        ]);

        $inicio = $request->de  ?? now()->subYear()->toDateString();
        $fim    = $request->ate ?? now()->toDateString();

        // ── Histórico detalhado ────────────────────────────────────────
        $historico = DB::table('escala_itens as ei')
            ->join('escalas as e',       'e.id',   '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->leftJoin('funcoes as f',   'f.id',   '=', 'ei.funcao_id')
            ->where('ei.cerimoniario_id', $cerimoniarioId)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->whereBetween('cel.data', [$inicio, $fim])
            ->select(
                'cel.data',
                'cel.horario',
                'cel.periodo_liturgico',
                'p.status',
                DB::raw("COALESCE(f.titulo, ei.funcao_label) as funcao_label")
            )
            ->orderByDesc('cel.data')
            ->get();

        // ── Resumo ─────────────────────────────────────────────────────
        $totalEscalado  = $historico->count();
        $serviu         = $historico->where('status', 'serviu')->count();
        $faltou         = $historico->where('status', 'faltou')->count();
        $justificado    = $historico->where('status', 'justificado')->count();
        $substituido    = $historico->where('status', 'substituido')->count();
        $semRegistro    = $historico->whereNull('status')->count();
        $taxaPresenca   = ($serviu + $faltou) > 0
            ? round($serviu / ($serviu + $faltou) * 100, 1)
            : null;

        // ── Por mês ────────────────────────────────────────────────────
        $porMes = DB::table('escala_itens as ei')
            ->join('escalas as e',       'e.id',   '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->where('ei.cerimoniario_id', $cerimoniarioId)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->whereBetween('cel.data', [$inicio, $fim])
            ->selectRaw("
                TO_CHAR(cel.data, 'YYYY-MM') as mes,
                COUNT(*) as total,
                COUNT(CASE WHEN p.status = 'serviu' THEN 1 END) as serviu,
                COUNT(CASE WHEN p.status = 'faltou' THEN 1 END) as faltou
            ")
            ->groupByRaw("TO_CHAR(cel.data, 'YYYY-MM')")
            ->orderBy('mes')
            ->get()
            ->map(fn($m) => (object) array_merge(
                (array) $m,
                ['label' => self::labelMes($m->mes)]
            ));

        return response()->json([
            'data' => [
                'cerimoniario' => [
                    'id'     => $cerimoniario->id,
                    'nome'   => $cerimoniario->nome,
                    'numero' => $cerimoniario->numero,
                    'ativo'  => $cerimoniario->ativo,
                ],
                'periodo' => ['inicio' => $inicio, 'fim' => $fim],
                'resumo'  => [
                    'total_escalado' => $totalEscalado,
                    'serviu'         => $serviu,
                    'faltou'         => $faltou,
                    'justificado'    => $justificado,
                    'substituido'    => $substituido,
                    'sem_registro'   => $semRegistro,
                    'taxa_presenca'  => $taxaPresenca,
                ],
                'por_mes'  => $porMes,
                'historico'=> $historico,
            ],
            'message' => 'Relatório de frequência gerado com sucesso.',
        ]);
    }

    public function crescimento(Request $request): JsonResponse
    {
        $request->validate([
            'de'  => 'nullable|date',
            'ate' => 'nullable|date',
        ]);

        $inicio = $request->de  ?? now()->subMonths(12)->startOfMonth()->toDateString();
        $fim    = $request->ate ?? now()->toDateString();

        // ── Resumo geral ───────────────────────────────────────────────
        $totalAtivos   = Cerimoniario::where('ativo', true)->count();
        $totalInativos = Cerimoniario::where('ativo', false)->count();
        $totalGeral    = Cerimoniario::count();

        $novosNoPeriodo = Cerimoniario::whereBetween('created_at', [$inicio, $fim . ' 23:59:59'])->count();

        $interessadosNoPeriodo = DB::table('interessados')
            ->whereBetween('created_at', [$inicio, $fim . ' 23:59:59'])
            ->count();

        // ── Por mês ────────────────────────────────────────────────────
        // Build month sequence
        $start = \Carbon\Carbon::parse($inicio)->startOfMonth();
        $end   = \Carbon\Carbon::parse($fim)->endOfMonth();

        $porMes = [];
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            $mesStr      = $cursor->format('Y-m');
            $endOfMonth  = $cursor->copy()->endOfMonth()->toDateTimeString();

            $novosMes = DB::table('cerimoniarios')
                ->whereNull('deleted_at')
                ->whereYear('created_at', $cursor->year)
                ->whereMonth('created_at', $cursor->month)
                ->count();

            $interessadosMes = DB::table('interessados')
                ->whereYear('created_at', $cursor->year)
                ->whereMonth('created_at', $cursor->month)
                ->count();

            $acumulado = DB::table('cerimoniarios')
                ->whereNull('deleted_at')
                ->where('created_at', '<=', $endOfMonth)
                ->count();

            $porMes[] = [
                'mes'                    => $mesStr,
                'label'                  => self::labelMes($mesStr),
                'novos_cerimoniarios'    => $novosMes,
                'interessados'           => $interessadosMes,
                'acumulado_cerimoniarios'=> $acumulado,
            ];

            $cursor->addMonth();
        }

        return response()->json([
            'data' => [
                'resumo'  => [
                    'total_ativos'           => $totalAtivos,
                    'total_inativos'         => $totalInativos,
                    'total_geral'            => $totalGeral,
                    'novos_no_periodo'       => $novosNoPeriodo,
                    'interessados_no_periodo'=> $interessadosNoPeriodo,
                ],
                'por_mes' => $porMes,
            ],
            'message' => 'Relatório de crescimento gerado com sucesso.',
        ]);
    }

    public function emprestimos(Request $request): JsonResponse
    {
        $request->validate(['de' => 'nullable|date', 'ate' => 'nullable|date']);
        $inicio = $request->de  ?? now()->subYear()->toDateString();
        $fim    = $request->ate ?? now()->toDateString();

        // Top borrowers
        $topUsuarios = DB::table('tunica_emprestimos as te')
            ->join('cerimoniarios as c', 'c.id', '=', 'te.cerimoniario_id')
            ->whereBetween('te.data_emprestimo', [$inicio, $fim])
            ->groupBy('c.id', 'c.nome')
            ->selectRaw('c.id, c.nome, COUNT(*) as total_emprestimos, COUNT(CASE WHEN te.status = \'perdida\' THEN 1 END) as perdidas')
            ->orderByRaw('total_emprestimos DESC')
            ->limit(10)
            ->get();

        // Top túnicas com mais perdas
        $topPerdidas = DB::table('tunica_emprestimos as te')
            ->join('tunicas as t', 't.id', '=', 'te.tunica_id')
            ->where('te.status', 'perdida')
            ->whereBetween('te.data_emprestimo', [$inicio, $fim])
            ->groupBy('t.id', 't.codigo', 't.cor')
            ->selectRaw('t.id, t.codigo, t.cor, COUNT(*) as ocorrencias_perda')
            ->orderByRaw('ocorrencias_perda DESC')
            ->limit(10)
            ->get();

        // Tempo médio de devolução (apenas devolvidas)
        $tempoMedio = DB::table('tunica_emprestimos')
            ->where('status', 'devolvida')
            ->whereNotNull('data_devolucao_real')
            ->whereBetween('data_emprestimo', [$inicio, $fim])
            ->selectRaw("ROUND(AVG(DATE_PART('day', data_devolucao_real::timestamp - data_emprestimo::timestamp))::numeric, 1) as media_dias")
            ->value('media_dias');

        // Totais gerais
        $totais = DB::table('tunica_emprestimos')
            ->whereBetween('data_emprestimo', [$inicio, $fim])
            ->selectRaw("
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'devolvida' THEN 1 END) as devolvidas,
                COUNT(CASE WHEN status = 'emprestada' THEN 1 END) as em_aberto,
                COUNT(CASE WHEN status = 'perdida'   THEN 1 END) as perdidas
            ")
            ->first();

        // Histórico recente
        $historico = DB::table('tunica_emprestimos as te')
            ->join('tunicas as t', 't.id', '=', 'te.tunica_id')
            ->join('cerimoniarios as c', 'c.id', '=', 'te.cerimoniario_id')
            ->whereBetween('te.data_emprestimo', [$inicio, $fim])
            ->select('te.id', 't.codigo', 't.cor', 'c.nome as cerimoniario', 'te.data_emprestimo', 'te.data_devolucao_real', 'te.data_devolucao_prevista', 'te.status')
            ->orderByDesc('te.data_emprestimo')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => [
                'periodo'          => ['inicio' => $inicio, 'fim' => $fim],
                'totais'           => $totais,
                'tempo_medio_dias' => $tempoMedio,
                'top_usuarios'     => $topUsuarios,
                'top_perdidas'     => $topPerdidas,
                'historico'        => $historico,
            ],
            'message' => 'Relatório de empréstimos gerado com sucesso.',
        ]);
    }

    public function assiduidade(Request $request): JsonResponse
    {
        $request->validate(['de' => 'nullable|date', 'ate' => 'nullable|date']);
        $inicio = $request->de  ?? now()->subYear()->toDateString();
        // +30 dias para capturar faltas pré-registradas em celebrações futuras próximas
        $fim    = $request->ate ?? now()->addDays(30)->toDateString();

        // Por período litúrgico
        $porPeriodo = DB::table('escala_itens as ei')
            ->join('escalas as e',       'e.id',   '=', 'ei.escala_id')
            ->join('celebracoes as c',   'c.id',   '=', 'e.celebracao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)->where('e.ativo', true)
            ->whereNull('c.deleted_at')->whereNull('e.deleted_at')
            ->groupBy('c.periodo_liturgico')
            ->selectRaw("
                c.periodo_liturgico,
                COUNT(*) as total_escalados,
                COUNT(CASE WHEN p.status = 'serviu' THEN 1 END) as serviu,
                COUNT(CASE WHEN p.status = 'faltou' THEN 1 END) as faltou,
                COUNT(CASE WHEN p.status = 'justificado' THEN 1 END) as justificado,
                COUNT(CASE WHEN p.status = 'substituido' THEN 1 END) as substituido
            ")
            ->orderBy('total_escalados', 'desc')
            ->get()
            ->map(function ($row) {
                $sf = (int)$row->serviu + (int)$row->faltou;
                $row->taxa_pct = $sf > 0 ? round($row->serviu / $sf * 100, 1) : null;
                return $row;
            });

        // Top ausentes — parte de presencas (mesmo padrão do dashboard individual)
        $topAusentes = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id',  '=', 'p.escala_item_id')
            ->join('escalas as e',       'e.id',   '=', 'ei.escala_id')
            ->join('celebracoes as c',   'c.id',   '=', 'e.celebracao_id')
            ->join('cerimoniarios as cr','cr.id',  '=', 'ei.cerimoniario_id')
            ->where('p.status', 'faltou')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)->where('e.ativo', true)
            ->whereNull('c.deleted_at')->whereNull('e.deleted_at')
            ->groupBy('cr.id', 'cr.nome')
            ->selectRaw('cr.id, cr.nome, COUNT(*) as total_faltas')
            ->orderByRaw('total_faltas DESC')
            ->limit(10)
            ->get();

        // Ausentes por mês — mesmo padrão
        $ausentesPorMes = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id',  '=', 'p.escala_item_id')
            ->join('escalas as e',       'e.id',   '=', 'ei.escala_id')
            ->join('celebracoes as c',   'c.id',   '=', 'e.celebracao_id')
            ->join('cerimoniarios as cr','cr.id',  '=', 'ei.cerimoniario_id')
            ->where('p.status', 'faltou')
            ->whereNotNull('ei.cerimoniario_id')
            ->whereBetween('c.data', [$inicio, $fim])
            ->where('c.ativo', true)->where('e.ativo', true)
            ->whereNull('c.deleted_at')->whereNull('e.deleted_at')
            ->selectRaw("TO_CHAR(c.data, 'YYYY-MM') as mes, cr.id, cr.nome, COUNT(*) as faltas")
            ->groupByRaw("TO_CHAR(c.data, 'YYYY-MM'), cr.id, cr.nome")
            ->orderBy('mes')
            ->get()
            ->groupBy('mes')
            ->map(fn($items, $mes) => [
                'mes'   => $mes,
                'label' => self::labelMes($mes),
                'itens' => $items->sortByDesc('faltas')->take(5)->values(),
            ])
            ->values();

        return response()->json([
            'data' => [
                'periodo'          => ['inicio' => $inicio, 'fim' => $fim],
                'por_periodo'      => $porPeriodo,
                'top_ausentes'     => $topAusentes,
                'ausentes_por_mes' => $ausentesPorMes,
            ],
            'message' => 'Relatório de assiduidade gerado com sucesso.',
        ]);
    }

    public function treinamentos(Request $request): JsonResponse
    {
        $request->validate([
            'de'  => 'nullable|date',
            'ate' => 'nullable|date',
        ]);

        $inicio = $request->de  ?? now()->subYear()->toDateString();
        $fim    = $request->ate ?? now()->toDateString();

        // ── Por treinamento ────────────────────────────────────────────
        $porTreinamento = DB::table('treinamentos as t')
            ->leftJoin('treinamento_presencas as tp', 'tp.treinamento_id', '=', 't.id')
            ->whereNull('t.deleted_at')
            ->whereBetween('t.data', [$inicio, $fim])
            ->groupBy('t.id', 't.data', 't.tema', 't.local')
            ->selectRaw("
                t.id,
                t.data,
                t.tema,
                t.local,
                COUNT(tp.id)                                                     as total_convocados,
                COUNT(CASE WHEN tp.status = 'presente'    THEN 1 END)           as presentes,
                COUNT(CASE WHEN tp.status = 'ausente'     THEN 1 END)           as ausentes,
                COUNT(CASE WHEN tp.status = 'justificado' THEN 1 END)           as justificados,
                COUNT(CASE WHEN tp.id IS NULL OR tp.status IS NULL THEN 1 END)  as sem_registro
            ")
            ->orderBy('t.data')
            ->get()
            ->map(function ($row) {
                $presentes = (int) $row->presentes;
                $ausentes  = (int) $row->ausentes;
                $total     = (int) $row->total_convocados;
                $row->taxa_presenca_pct = ($presentes + $ausentes) > 0
                    ? round($presentes / ($presentes + $ausentes) * 100, 1)
                    : null;
                return $row;
            });

        // ── Totais ─────────────────────────────────────────────────────
        $totalTreinamentos  = $porTreinamento->count();
        $totalParticipantes = DB::table('treinamento_presencas as tp')
            ->join('treinamentos as t', 't.id', '=', 'tp.treinamento_id')
            ->whereNull('t.deleted_at')
            ->whereBetween('t.data', [$inicio, $fim])
            ->distinct('tp.cerimoniario_id')
            ->count('tp.cerimoniario_id');

        $mediaPresencaPct = $porTreinamento->whereNotNull('taxa_presenca_pct')->avg('taxa_presenca_pct');

        // ── Por cerimoniário ───────────────────────────────────────────
        $porCerimoniario = DB::table('treinamento_presencas as tp')
            ->join('treinamentos as t',   't.id',   '=', 'tp.treinamento_id')
            ->join('cerimoniarios as c',  'c.id',   '=', 'tp.cerimoniario_id')
            ->whereNull('t.deleted_at')
            ->whereBetween('t.data', [$inicio, $fim])
            ->groupBy('c.id', 'c.nome')
            ->selectRaw("
                c.id,
                c.nome,
                COUNT(tp.id)                                              as treinamentos_convocado,
                COUNT(CASE WHEN tp.status = 'presente'    THEN 1 END)   as presentes,
                COUNT(CASE WHEN tp.status = 'ausente'     THEN 1 END)   as ausentes,
                COUNT(CASE WHEN tp.status = 'justificado' THEN 1 END)   as justificados
            ")
            ->orderByRaw('presentes DESC')
            ->get()
            ->map(function ($row) {
                $presentes = (int) $row->presentes;
                $ausentes  = (int) $row->ausentes;
                $row->taxa_pct = ($presentes + $ausentes) > 0
                    ? round($presentes / ($presentes + $ausentes) * 100, 1)
                    : null;
                return $row;
            });

        return response()->json([
            'data' => [
                'totais' => [
                    'total_treinamentos'  => $totalTreinamentos,
                    'total_participantes' => $totalParticipantes,
                    'media_presenca_pct'  => $mediaPresencaPct ? round($mediaPresencaPct, 1) : null,
                ],
                'por_treinamento' => $porTreinamento,
                'por_cerimoniario'=> $porCerimoniario,
            ],
            'message' => 'Relatório de treinamentos gerado com sucesso.',
        ]);
    }
}

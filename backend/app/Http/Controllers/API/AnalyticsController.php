<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Celebracao;
use App\Models\EscalaItem;
use App\Models\Presenca;
use App\Models\Treinamento;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'evolucao'  => $this->buildEvolucao(),
            'ranking'   => $this->buildRanking(),
            'risco'     => $this->buildRisco(),
            'funcoes'   => $this->buildFuncoes(),
            'saude'     => $this->buildSaude(),
            'projecao'  => $this->buildProjecao(),
        ]);
    }

    /* ── Evolução do Ministério ─────────────────────────── */
    private function buildEvolucao(): array
    {
        $meses = [];
        for ($i = 11; $i >= 0; $i--) {
            $meses[] = Carbon::now()->subMonths($i)->format('Y-m');
        }

        // Celebrações por mês
        $celebracoesPorMes = DB::table('celebracoes')
            ->selectRaw("TO_CHAR(data, 'YYYY-MM') as mes, COUNT(*) as total")
            ->whereNull('deleted_at')
            ->whereRaw("TO_CHAR(data, 'YYYY-MM') >= ?", [Carbon::now()->subMonths(11)->format('Y-m')])
            ->groupBy('mes')
            ->pluck('total', 'mes');

        // Acólitos cadastrados (cumulativo) por mês
        $novosAcolitos = DB::table('cerimoniarios')
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as mes, COUNT(*) as total")
            ->whereNull('deleted_at')
            ->whereRaw("TO_CHAR(created_at, 'YYYY-MM') >= ?", [Carbon::now()->subMonths(11)->format('Y-m')])
            ->groupBy('mes')
            ->pluck('total', 'mes');

        $totalAtivosBase = Cerimoniario::whereNull('deleted_at')
            ->where('created_at', '<', Carbon::now()->subMonths(11)->startOfMonth())
            ->count();

        $dados = [];
        $totalAcumul = $totalAtivosBase;
        foreach ($meses as $mes) {
            $totalAcumul += $novosAcolitos[$mes] ?? 0;
            $dados[] = [
                'mes'         => $mes,
                'label'       => Carbon::createFromFormat('Y-m', $mes)->locale('pt_BR')->isoFormat('MMM[/]YY'),
                'celebracoes' => (int) ($celebracoesPorMes[$mes] ?? 0),
                'acolitos'    => $totalAcumul,
            ];
        }

        return $dados;
    }

    /* ── Ranking de Assiduidade ─────────────────────────── */
    private function buildRanking(): array
    {
        $rows = DB::table('cerimoniarios as c')
            ->leftJoin('escala_itens as ei', 'ei.cerimoniario_id', '=', 'c.id')
            ->leftJoin('escalas as e', function ($j) {
                $j->on('e.id', '=', 'ei.escala_id')
                  ->where('e.ativo', true)
                  ->whereNull('e.deleted_at');
            })
            ->leftJoin('celebracoes as cel', function ($j) {
                $j->on('cel.id', '=', 'e.celebracao_id')
                  ->where('cel.ativo', true)
                  ->whereNull('cel.deleted_at');
            })
            ->leftJoin('presencas as p', function ($j) {
                $j->on('p.escala_item_id', '=', 'ei.id')->whereNotNull('p.status');
            })
            ->where('c.ativo', true)
            ->whereNull('c.deleted_at')
            ->select('c.id', 'c.nome')
            ->selectRaw("SUM(CASE WHEN p.status = 'serviu' AND cel.id IS NOT NULL THEN 1 ELSE 0 END) as presente")
            ->selectRaw("SUM(CASE WHEN p.status = 'faltou' AND cel.id IS NOT NULL THEN 1 ELSE 0 END) as ausente")
            ->selectRaw("SUM(CASE WHEN p.status = 'substituido' AND cel.id IS NOT NULL THEN 1 ELSE 0 END) as substituido")
            ->selectRaw("SUM(CASE WHEN p.status = 'justificado' AND cel.id IS NOT NULL THEN 1 ELSE 0 END) as justificado")
            ->selectRaw("SUM(CASE WHEN p.id IS NOT NULL AND cel.id IS NOT NULL THEN 1 ELSE 0 END) as total")
            ->groupBy('c.id', 'c.nome')
            ->get();

        // Trend: compare last 3 months vs previous 3 months
        $tresMeses    = Carbon::now()->subMonths(3)->toDateString();
        $seisAntMeses = Carbon::now()->subMonths(6)->toDateString();

        $recente = DB::table('presencas as p')
            ->join('escala_itens as ei', 'p.escala_item_id', '=', 'ei.id')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('celebracoes as c', 'e.celebracao_id', '=', 'c.id')
            ->where('e.ativo', true)
            ->whereNull('e.deleted_at')
            ->where('c.ativo', true)
            ->whereNull('c.deleted_at')
            ->where('c.data', '>=', $tresMeses)
            ->whereNotNull('p.status')
            ->select('ei.cerimoniario_id')
            ->selectRaw("SUM(CASE WHEN p.status = 'serviu' THEN 1 ELSE 0 END) as presente")
            ->selectRaw("COUNT(p.id) as total")
            ->groupBy('ei.cerimoniario_id')
            ->get()->keyBy('cerimoniario_id');

        $anterior = DB::table('presencas as p')
            ->join('escala_itens as ei', 'p.escala_item_id', '=', 'ei.id')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('celebracoes as c', 'e.celebracao_id', '=', 'c.id')
            ->where('e.ativo', true)
            ->whereNull('e.deleted_at')
            ->where('c.ativo', true)
            ->whereNull('c.deleted_at')
            ->whereBetween('c.data', [$seisAntMeses, $tresMeses])
            ->whereNotNull('p.status')
            ->select('ei.cerimoniario_id')
            ->selectRaw("SUM(CASE WHEN p.status = 'serviu' THEN 1 ELSE 0 END) as presente")
            ->selectRaw("COUNT(p.id) as total")
            ->groupBy('ei.cerimoniario_id')
            ->get()->keyBy('cerimoniario_id');

        $ranking = $rows->map(function ($r) use ($recente, $anterior) {
            // Frequência geral: Serviu ÷ Total com status registrado × 100 (inteiro)
            $pct = $r->total > 0 ? round(($r->presente / $r->total) * 100) : null;

            $pctRec = ($recente[$r->id] ?? null);
            $pctRec = $pctRec && $pctRec->total > 0 ? ($pctRec->presente / $pctRec->total) * 100 : null;

            $pctAnt = ($anterior[$r->id] ?? null);
            $pctAnt = $pctAnt && $pctAnt->total > 0 ? ($pctAnt->presente / $pctAnt->total) * 100 : null;

            // Tendência: compara taxa 0–3m com taxa 3–6m atrás.
            // "subindo"  se diferença > +5 p.p.
            // "caindo"   se diferença < -5 p.p.
            // "estavel"  caso contrário ou quando não há dados suficientes.
            $tendencia = 'estavel';
            if ($pctRec !== null && $pctAnt !== null) {
                if ($pctRec > $pctAnt + 5) $tendencia = 'subindo';
                elseif ($pctRec < $pctAnt - 5) $tendencia = 'caindo';
            }

            return [
                'id'         => $r->id,
                'nome'       => $r->nome,
                'presente'   => (int) $r->presente,
                'ausente'    => (int) $r->ausente,
                'substituido'=> (int) $r->substituido,
                'justificado'=> (int) $r->justificado,
                'total'      => (int) $r->total,
                'pct'        => $pct,
                'tendencia'  => $tendencia,
            ];
        })->filter(fn($r) => $r['total'] > 0)
          ->sortByDesc('pct')
          ->values();

        return $ranking->toArray();
    }

    /* ── Acólitos em Risco ──────────────────────────────── */
    private function buildRisco(): array
    {
        $cerimoniarios = Cerimoniario::where('ativo', true)->select('id', 'nome')->get();
        $emRisco = [];

        foreach ($cerimoniarios as $c) {
            $ultimas = DB::table('presencas as p')
                ->join('escala_itens as ei', 'p.escala_item_id', '=', 'ei.id')
                ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
                ->join('celebracoes as cel', 'e.celebracao_id', '=', 'cel.id')
                ->where('ei.cerimoniario_id', $c->id)
                ->where('e.ativo', true)
                ->whereNull('e.deleted_at')
                ->where('cel.ativo', true)
                ->whereNull('cel.deleted_at')
                ->whereNotNull('p.status')
                ->orderBy('cel.data', 'desc')
                ->orderBy('cel.horario', 'desc')
                ->select('p.status', 'cel.data')
                ->limit(6)
                ->get();

            $streak = 0;
            foreach ($ultimas as $p) {
                if ($p->status === 'faltou') {
                    $streak++;
                } else {
                    break;
                }
            }

            if ($streak >= 3) {
                $emRisco[] = [
                    'id'                  => $c->id,
                    'nome'                => $c->nome,
                    'faltas_consecutivas' => $streak,
                    'ultima_data'         => $ultimas->first()?->data,
                ];
            }
        }

        usort($emRisco, fn($a, $b) => $b['faltas_consecutivas'] <=> $a['faltas_consecutivas']);

        return $emRisco;
    }

    /* ── Funções Mais Escaladas ─────────────────────────── */
    private function buildFuncoes(): array
    {
        $funcoes = DB::table('escala_itens as ei')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->where('e.ativo', true)
            ->whereNotNull('ei.funcao_label')
            ->select('ei.funcao_label as funcao')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COUNT(DISTINCT ei.cerimoniario_id) as acolitos_unicos')
            ->groupBy('ei.funcao_label')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Quais acólitos mais são escalados em cada função
        $topAcolito = DB::table('escala_itens as ei')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('cerimoniarios as c', 'ei.cerimoniario_id', '=', 'c.id')
            ->where('e.ativo', true)
            ->whereNotNull('ei.funcao_label')
            ->whereNotNull('ei.cerimoniario_id')
            ->select('ei.funcao_label', 'c.nome')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('ei.funcao_label', 'c.nome', 'ei.cerimoniario_id')
            ->orderByDesc('cnt')
            ->get()
            ->groupBy('funcao_label')
            ->map(fn($g) => $g->first()->nome);

        return $funcoes->map(fn($f) => [
            'funcao'         => $f->funcao,
            'total'          => (int) $f->total,
            'acolitos_unicos'=> (int) $f->acolitos_unicos,
            'top_acolito'    => $topAcolito[$f->funcao] ?? null,
        ])->values()->toArray();
    }

    /* ── Saúde do Ministério ────────────────────────────── */
    private function buildSaude(): array
    {
        // 1. Presença média geral (peso 40%)
        $statusResumo = DB::table('presencas')->whereNotNull('status')
            ->selectRaw("status, COUNT(*) as total")
            ->groupBy('status')->get()->keyBy('status');

        $serviu   = $statusResumo->get('serviu')?->total ?? 0;
        $faltou   = $statusResumo->get('faltou')?->total ?? 0;
        $subst    = $statusResumo->get('substituido')?->total ?? 0;
        $justif   = $statusResumo->get('justificado')?->total ?? 0;
        $totalP   = $serviu + $faltou + $subst + $justif;
        $presMedia = $totalP > 0 ? ($serviu / $totalP) * 100 : 0;

        // 2. Taxa de confirmação positiva via link (peso 30%)
        $confirmados = DB::table('escala_itens')->where('status_confirmacao', 'confirmado')->count();
        $recusados   = DB::table('escala_itens')->where('status_confirmacao', 'recusado')->count();
        $totalConf   = $confirmados + $recusados;
        $taxaConf    = $totalConf > 0 ? ($confirmados / $totalConf) * 100 : 75;

        // 3. % acólitos ativos que serviram no último mês (peso 20%)
        $mesPassado   = Carbon::now()->subMonth()->startOfMonth()->toDateString();
        $fimMesPassado = Carbon::now()->subMonth()->endOfMonth()->toDateString();
        $totalAtivos  = Cerimoniario::where('ativo', true)->count();
        $serviramMes  = DB::table('escala_itens as ei')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('celebracoes as c', 'e.celebracao_id', '=', 'c.id')
            ->join('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereBetween('c.data', [$mesPassado, $fimMesPassado])
            ->where('p.status', 'serviu')
            ->distinct('ei.cerimoniario_id')
            ->count('ei.cerimoniario_id');
        $taxaAtividade = $totalAtivos > 0 ? min(($serviramMes / $totalAtivos) * 100, 100) : 0;

        // 4. Treinamentos últimos 3 meses (peso 10%)
        $treinamentos = Treinamento::where('data', '>=', Carbon::now()->subMonths(3)->toDateString())->count();
        $treiScore    = min($treinamentos * 25, 100);

        // Score de Saúde do Ministério (0–100):
        //   Presença média  × 40%  (Serviu ÷ total com status × 100)
        //   Confirmações    × 30%  (Confirmados ÷ (Confirmados + Recusados) × 100; padrão 75% se vazio)
        //   Acólitos ativos × 20%  (Serviram mês anterior ÷ Total ativos × 100; máx 100)
        //   Treinamentos    × 10%  (25 pts por treino nos últimos 3m; máx 100)
        $score = (int) round(
            $presMedia * 0.40 +
            $taxaConf  * 0.30 +
            $taxaAtividade * 0.20 +
            $treiScore * 0.10
        );

        return [
            'score'          => $score,
            'presenca_media' => round($presMedia),
            'taxa_confirmacao'=> round($taxaConf),
            'taxa_atividade' => round($taxaAtividade),
            'treinamentos_3m'=> $treinamentos,
            'nivel'          => $score >= 80 ? 'excelente' : ($score >= 60 ? 'bom' : ($score >= 40 ? 'atencao' : 'critico')),
        ];
    }

    /* ── Projeção de Celebrações ────────────────────────── */
    private function buildProjecao(): array
    {
        $meses = [];
        for ($i = 11; $i >= 0; $i--) {
            $meses[] = Carbon::now()->subMonths($i)->format('Y-m');
        }

        $counts = DB::table('celebracoes')
            ->selectRaw("TO_CHAR(data, 'YYYY-MM') as mes, COUNT(*) as total")
            ->whereNull('deleted_at')
            ->whereRaw("TO_CHAR(data, 'YYYY-MM') >= ?", [Carbon::now()->subMonths(11)->format('Y-m')])
            ->groupBy('mes')
            ->pluck('total', 'mes');

        $historico = [];
        foreach ($meses as $mes) {
            $historico[] = [
                'mes'   => $mes,
                'label' => Carbon::createFromFormat('Y-m', $mes)->locale('pt_BR')->isoFormat('MMM[/]YY'),
                'total' => (int) ($counts[$mes] ?? 0),
            ];
        }

        // Projeção do próximo mês: média dos últimos 3 com ajuste sazonal
        $ultimos3   = array_slice($historico, -3);
        $media      = array_sum(array_column($ultimos3, 'total')) / 3;
        $proxMes    = Carbon::now()->addMonth();
        $mesmoMesAnoAnterior = $counts[$proxMes->copy()->subYear()->format('Y-m')] ?? null;

        // Projeção do próximo mês:
        //   Com histórico sazonal: Média últimos 3m × 60% + Mesmo mês do ano anterior × 40%
        //   Sem histórico sazonal: Apenas média dos últimos 3 meses
        //   Combina tendência recente com sazonalidade anual para melhor precisão.
        $projecao = $mesmoMesAnoAnterior !== null
            ? round($media * 0.6 + $mesmoMesAnoAnterior * 0.4)
            : round($media);

        return [
            'historico'      => $historico,
            'proximo_mes'    => $proxMes->locale('pt_BR')->isoFormat('MMMM [de] YYYY'),
            'projecao'       => (int) $projecao,
            'min_recente'    => min(array_column($ultimos3, 'total')),
            'max_recente'    => max(array_column($ultimos3, 'total')),
        ];
    }
}

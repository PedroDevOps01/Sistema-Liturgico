<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use App\Models\Cerimoniario;
use App\Models\Escala;
use App\Models\EscalaItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $hoje = now()->toDateString();
        $inicioMes = now()->startOfMonth()->toDateString();
        $fimMes = now()->endOfMonth()->toDateString();

        // Próximas celebrações (próximos 30 dias) — apenas ativas
        $proximasCelebracoes = Celebracao::with(['escala' => fn ($q) => $q->where('ativo', true)])
            ->where('ativo', true)
            ->where('data', '>=', $hoje)
            ->where('data', '<=', now()->addDays(30)->toDateString())
            ->orderBy('data')
            ->orderBy('horario')
            ->take(10)
            ->get();

        // Escalas do mês — apenas escalas ativas
        $escalasDoMes = Escala::where('ativo', true)
            ->whereHas('celebracao', function ($q) use ($inicioMes, $fimMes) {
                $q->whereBetween('data', [$inicioMes, $fimMes])->where('ativo', true);
            })->count();

        // Cerimoniários ativos
        $cerimoniarios_ativos = Cerimoniario::where('ativo', true)->count();

        // Celebrações sem escala ativa (próximos 30 dias)
        $celebracoesSemEscala = Celebracao::where('ativo', true)
            ->whereDoesntHave('escala', fn ($q) => $q->where('ativo', true))
            ->where('data', '>=', $hoje)
            ->where('data', '<=', now()->addDays(30)->toDateString())
            ->count();

        // Alertas de conflito: cerimoniários escalados em 2+ celebrações no mesmo horário
        $alertasConflito = DB::table('escala_itens as ei')
            ->join('escalas as e', function ($j) {
                $j->on('e.id', '=', 'ei.escala_id')->where('e.ativo', true);
            })
            ->join('celebracoes as c', function ($j) use ($hoje) {
                $j->on('c.id', '=', 'e.celebracao_id')
                  ->where('c.ativo', true)
                  ->where('c.data', '>=', $hoje);
            })
            ->join('cerimoniarios as cer', 'cer.id', '=', 'ei.cerimoniario_id')
            ->whereNotNull('ei.cerimoniario_id')
            ->selectRaw('cer.nome as cerimoniario_nome, c.data, c.horario, COUNT(*) as qtd_escalas')
            ->groupBy('ei.cerimoniario_id', 'c.data', 'c.horario', 'cer.nome')
            ->havingRaw('COUNT(*) > 1')
            ->orderBy('c.data')
            ->orderBy('c.horario')
            ->get();

        // Celebrações de hoje com escala e cerimoniários
        $celebracoesHoje = Celebracao::with([
            'escala' => fn($q) => $q->where('ativo', true)
                ->with(['itens.cerimoniario', 'itens.funcao']),
        ])
        ->where('ativo', true)
        ->where('data', $hoje)
        ->orderBy('horario')
        ->get();

        // Alertas: escalas nos próximos 7 dias com confirmações pendentes
        $alertasConfirmacao = DB::table('escalas as e')
            ->join('celebracoes as c', 'c.id', '=', 'e.celebracao_id')
            ->join('escala_itens as ei', 'ei.escala_id', '=', 'e.id')
            ->where('e.ativo', true)
            ->where('c.ativo', true)
            ->whereNotNull('ei.cerimoniario_id')
            ->where('c.data', '>', $hoje)
            ->where('c.data', '<=', now()->addDays(7)->toDateString())
            ->whereNull('ei.status_confirmacao')
            ->selectRaw('c.id as celebracao_id, c.data, c.horario, c.periodo_liturgico, COUNT(ei.id) as pendentes')
            ->groupBy('c.id', 'c.data', 'c.horario', 'c.periodo_liturgico')
            ->orderBy('c.data')
            ->get();

        return response()->json([
            'data' => [
                'proximasCelebracoes' => $proximasCelebracoes,
                'escalasDoMes' => $escalasDoMes,
                'cerimoniarios_ativos' => $cerimoniarios_ativos,
                'celebracoesSemEscala' => $celebracoesSemEscala,
                'alertasConflito' => $alertasConflito,
                'celebracoesHoje' => $celebracoesHoje,
                'alertasConfirmacao' => $alertasConfirmacao,
            ],
            'message' => 'Dashboard carregado com sucesso.',
        ]);
    }
}

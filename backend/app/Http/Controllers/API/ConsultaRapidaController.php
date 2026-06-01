<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Celebracao;
use App\Models\Escala;
use App\Models\Funcao;
use App\Models\HistoricoEscala;
use App\Models\Presenca;
use App\Models\Treinamento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsultaRapidaController extends Controller
{
    public function consultar(Request $request): JsonResponse
    {
        $tipo = $request->input('tipo');

        $resultado = match ($tipo) {
            'estatisticas_gerais'       => $this->estatisticasGerais(),
            'ranking_servicos'          => $this->rankingServicos(),
            'proximas_escalas'          => $this->proximasEscalas(),
            'escalas_semana'            => $this->escalasSemana(),
            'escalas_mes'               => $this->escalasMes(),
            'ultimas_escalas'           => $this->ultimasEscalas(),
            'celebracoes_sem_escala'    => $this->celebracoesSemEscala(),
            'proximas_celebracoes'      => $this->proximasCelebracoes(),
            'celebracoes_mes'           => $this->celebracoesMes(),
            'casamentos'                => $this->casamentos(),
            'batismos'                  => $this->batismos(),
            'celebracoes_fim_semana'    => $this->celebracoesFimSemana(),
            'cerimoniarios_ativos'      => $this->cerimoniáriosAtivos(),
            'cerimoniarios_inativos'    => $this->cerimoniáriosInativos(),
            'cerimoniarios_experientes' => $this->cerimoniáriosExperientes(),
            'indisponiveis_temporario'  => $this->indisponiveisTemporario(),
            'disponiveis_domingo_manha' => $this->disponiveis('domingo_manha'),
            'disponiveis_domingo_tarde' => $this->disponiveis('domingo_tarde'),
            'disponiveis_domingo_noite' => $this->disponiveis('domingo_noite'),
            'disponiveis_sabado'        => $this->disponiveis('sabado'),
            'disponiveis_semana_manha'  => $this->disponiveis('semana_manha'),
            'resumo_presencas'          => $this->resumoPresencas(),
            'mais_faltaram'             => $this->maisFaltaram(),
            'presencas_pendentes'       => $this->presencasPendentes(),
            'proximos_treinamentos'     => $this->proximosTreinamentos(),
            'historico_treinamentos'    => $this->historicoTreinamentos(),
            'funcoes_liturgicas'        => $this->funcoesLiturgicas(),
            'historico_escalas'         => $this->historicoEscalas(),
            default                     => "Consulta '$tipo' não encontrada.",
        };

        return response()->json(['message' => $resultado]);
    }

    // ── Visão Geral ───────────────────────────────────────────────────────

    private function estatisticasGerais(): string
    {
        $ativos       = Cerimoniario::where('ativo', true)->count();
        $inativos     = Cerimoniario::where('ativo', false)->count();
        $indisp       = Cerimoniario::where('indisponivel_temporario', true)->count();
        $experientes  = Cerimoniario::where('ativo', true)->where('experiente', true)->count();
        $escalas      = Escala::where('ativo', true)->count();
        $celebracoes  = Celebracao::where('ativo', true)->count();
        $semEscala    = Celebracao::where('ativo', true)->whereDoesntHave('escala')->count();
        $treinamentos = Treinamento::count();

        return "## 📊 Estatísticas Gerais\n\n"
            . "**Cerimoniários**\n"
            . "- Ativos: **{$ativos}**\n"
            . "- Inativos: **{$inativos}**\n"
            . "- Experientes: **{$experientes}**\n"
            . "- Indisponíveis temporariamente: **{$indisp}**\n\n"
            . "**Escalas e Celebrações**\n"
            . "- Total de escalas ativas: **{$escalas}**\n"
            . "- Total de celebrações: **{$celebracoes}**\n"
            . "- Celebrações sem escala: **{$semEscala}**\n\n"
            . "**Treinamentos**\n"
            . "- Total registrado: **{$treinamentos}**";
    }

    private function rankingServicos(): string
    {
        $lista = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id', '=', 'p.escala_item_id')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('cerimoniarios as c', 'c.id', '=', 'ei.cerimoniario_id')
            ->where('p.status', 'serviu')
            ->where('e.ativo', true)
            ->where('c.ativo', true)
            ->select('c.id', 'c.nome', DB::raw('COUNT(*) as total'))
            ->groupBy('c.id', 'c.nome')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        if ($lista->isEmpty()) return 'Nenhuma participação registrada.';

        $linhas = $lista->values()->map(fn($c, $i) =>
            ($i + 1) . ". **{$c->nome}** — {$c->total} " . ($c->total == 1 ? 'serviço' : 'serviços')
        )->implode("\n");

        return "## 🏆 Ranking — Quem Mais Serviu\n\n{$linhas}";
    }

    // ── Escalas ───────────────────────────────────────────────────────────

    private function proximasEscalas(): string
    {
        return $this->listarEscalas(now()->toDateString(), null, 10, 'Próximas Escalas');
    }

    private function escalasSemana(): string
    {
        return $this->listarEscalas(now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString(), 20, 'Escalas desta Semana');
    }

    private function escalasMes(): string
    {
        return $this->listarEscalas(now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString(), 50, 'Escalas deste Mês');
    }

    private function ultimasEscalas(): string
    {
        $escalas = Escala::with(['celebracao', 'escalaItens.cerimoniario', 'escalaItens.funcao'])
            ->where('ativo', true)
            ->whereHas('celebracao')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return $this->formatarEscalas($escalas, 'Últimas Escalas Criadas');
    }

    private function listarEscalas(string $inicio, ?string $fim, int $limite, string $titulo): string
    {
        $q = Escala::with(['celebracao', 'escalaItens.cerimoniario', 'escalaItens.funcao'])
            ->join('celebracoes', 'celebracoes.id', '=', 'escalas.celebracao_id')
            ->select('escalas.*')
            ->where('escalas.ativo', true)
            ->where('celebracoes.data', '>=', $inicio);

        if ($fim) $q->where('celebracoes.data', '<=', $fim);

        return $this->formatarEscalas(
            $q->orderBy('celebracoes.data')->limit($limite)->get(),
            $titulo
        );
    }

    private function formatarEscalas($escalas, string $titulo): string
    {
        if ($escalas->isEmpty()) return "## 📅 {$titulo}\n\nNenhuma escala encontrada.";

        $linhas = $escalas->map(function ($e) {
            $data    = $e->celebracao?->data?->format('d/m/Y') ?? '?';
            $horario = $e->celebracao?->horario ?? '';
            $periodo = $e->celebracao?->periodo_liturgico ?? '';
            $membros = $e->escalaItens->map(fn($i) => '  - ' . ($i->cerimoniario?->nome ?? '?') . ' — ' . ($i->funcao_label ?? $i->funcao?->titulo ?? '?'))->implode("\n");
            return "**{$data}" . ($horario ? " às {$horario}" : '') . "** ({$periodo})\n{$membros}";
        })->implode("\n\n");

        return "## 📅 {$titulo}\n\n{$linhas}";
    }

    // ── Celebrações ───────────────────────────────────────────────────────

    private function celebracoesSemEscala(): string
    {
        $lista = Celebracao::where('ativo', true)
            ->whereDoesntHave('escala')
            ->orderBy('data')
            ->get();

        if ($lista->isEmpty()) return "## ⛪ Celebrações sem Escala\n\nTodas as celebrações já possuem escala. ✅";

        $linhas = $lista->map(fn($c) =>
            "- **{$c->data?->format('d/m/Y')}** às {$c->horario} — {$c->periodo_liturgico}"
            . ($c->casamento ? ' 💍' : '') . ($c->batismo ? ' 💧' : '')
        )->implode("\n");

        $total = $lista->count();
        return "## ⛪ Celebrações sem Escala ({$total})\n\n{$linhas}";
    }

    private function proximasCelebracoes(): string
    {
        return $this->listarCelebracoes(now()->toDateString(), null, 15, 'Próximas Celebrações');
    }

    private function celebracoesMes(): string
    {
        $meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        $titulo = 'Celebrações de ' . $meses[(int)now()->format('n')] . ' de ' . now()->format('Y');

        return $this->listarCelebracoes(
            now()->startOfMonth()->toDateString(),
            now()->endOfMonth()->toDateString(),
            50,
            $titulo
        );
    }

    private function casamentos(): string
    {
        $lista = Celebracao::where('ativo', true)->where('casamento', true)
            ->where('data', '>=', now()->toDateString())
            ->withCount('escala')
            ->orderBy('data')->get();

        if ($lista->isEmpty()) return "## 💍 Casamentos\n\nNenhum casamento agendado.";

        $linhas = $lista->map(fn($c) =>
            "- **{$c->data?->format('d/m/Y')}** às {$c->horario}"
            . ($c->escala_count > 0 ? ' ✅ com escala' : ' ⚠️ sem escala')
        )->implode("\n");

        return "## 💍 Casamentos Agendados\n\n{$linhas}";
    }

    private function batismos(): string
    {
        $lista = Celebracao::where('ativo', true)->where('batismo', true)
            ->where('data', '>=', now()->toDateString())
            ->withCount('escala')
            ->orderBy('data')->get();

        if ($lista->isEmpty()) return "## 💧 Batismos\n\nNenhum batismo agendado.";

        $linhas = $lista->map(fn($c) =>
            "- **{$c->data?->format('d/m/Y')}** às {$c->horario}"
            . ($c->escala_count > 0 ? ' ✅ com escala' : ' ⚠️ sem escala')
        )->implode("\n");

        return "## 💧 Batismos Agendados\n\n{$linhas}";
    }

    private function celebracoesFimSemana(): string
    {
        return $this->listarCelebracoes(now()->toDateString(), null, 20, 'Celebrações de Fim de Semana', true);
    }

    private function listarCelebracoes(string $inicio, ?string $fim, int $limite, string $titulo, bool $fimSemana = false): string
    {
        $q = Celebracao::where('ativo', true)->where('data', '>=', $inicio)->withCount('escala');
        if ($fim) $q->where('data', '<=', $fim);
        if ($fimSemana) $q->where('final_de_semana', true);

        $lista = $q->orderBy('data')->limit($limite)->get();

        if ($lista->isEmpty()) return "## ⛪ {$titulo}\n\nNenhuma celebração encontrada.";

        $linhas = $lista->map(fn($c) => sprintf(
            "- **%s** às %s — %s%s",
            $c->data?->format('d/m/Y'),
            $c->horario,
            $c->periodo_liturgico,
            $c->escala_count > 0 ? ' ✅' : ' ⚠️'
        ))->implode("\n");

        return "## ⛪ {$titulo}\n\n{$linhas}\n\n_✅ com escala · ⚠️ sem escala_";
    }

    // ── Cerimoniários ─────────────────────────────────────────────────────

    private function cerimoniáriosAtivos(): string
    {
        $lista = Cerimoniario::where('ativo', true)->orderBy('nome')->get();
        if ($lista->isEmpty()) return 'Nenhum cerimoniário ativo.';
        $linhas = $lista->map(fn($c) => "- **{$c->nome}**" . ($c->numero ? " (Nº {$c->numero})" : '') . ($c->experiente ? ' ⭐' : ''))->implode("\n");
        return "## 👥 Cerimoniários Ativos ({$lista->count()})\n\n{$linhas}\n\n_⭐ experiente_";
    }

    private function cerimoniáriosInativos(): string
    {
        $lista = Cerimoniario::where('ativo', false)->orderBy('nome')->get();
        if ($lista->isEmpty()) return "## 👥 Cerimoniários Inativos\n\nNenhum cerimoniário inativo.";
        $linhas = $lista->map(fn($c) => "- {$c->nome}" . ($c->numero ? " (Nº {$c->numero})" : ''))->implode("\n");
        return "## 👥 Cerimoniários Inativos ({$lista->count()})\n\n{$linhas}";
    }

    private function cerimoniáriosExperientes(): string
    {
        $lista = Cerimoniario::where('ativo', true)->where('experiente', true)->orderBy('nome')->get();
        if ($lista->isEmpty()) return "## ⭐ Experientes\n\nNenhum cerimoniário marcado como experiente.";
        $linhas = $lista->map(fn($c) => "- **{$c->nome}**" . ($c->numero ? " (Nº {$c->numero})" : ''))->implode("\n");
        return "## ⭐ Cerimoniários Experientes ({$lista->count()})\n\n{$linhas}";
    }

    private function indisponiveisTemporario(): string
    {
        $lista = Cerimoniario::where('ativo', true)->where('indisponivel_temporario', true)->orderBy('nome')->get();
        if ($lista->isEmpty()) return "## 🚫 Indisponíveis Temporariamente\n\nNenhum cerimoniário indisponível no momento.";
        $linhas = $lista->map(fn($c) => "- **{$c->nome}**" . ($c->observacao ? " — {$c->observacao}" : ''))->implode("\n");
        return "## 🚫 Indisponíveis Temporariamente ({$lista->count()})\n\n{$linhas}";
    }

    private function disponiveis(string $periodo): string
    {
        $labels = [
            'domingo_manha' => 'Domingo Manhã',
            'domingo_tarde' => 'Domingo Tarde',
            'domingo_noite' => 'Domingo Noite',
            'sabado'        => 'Sábado',
            'semana_manha'  => 'Semana Manhã',
        ];

        $lista = Cerimoniario::where('ativo', true)
            ->where('indisponivel_temporario', false)
            ->where("disponivel_{$periodo}", true)
            ->orderBy('nome')
            ->get();

        $label = $labels[$periodo] ?? $periodo;
        if ($lista->isEmpty()) return "## 🗓️ Disponíveis — {$label}\n\nNenhum cerimoniário disponível para este período.";

        $linhas = $lista->map(fn($c) => "- **{$c->nome}**" . ($c->experiente ? ' ⭐' : ''))->implode("\n");
        return "## 🗓️ Disponíveis — {$label} ({$lista->count()})\n\n{$linhas}\n\n_⭐ experiente_";
    }

    // ── Presenças ─────────────────────────────────────────────────────────

    private function resumoPresencas(): string
    {
        $totais = Presenca::whereHas('escalaItem.escala', fn($s) => $s->where('ativo', true))
            ->selectRaw("status, COUNT(*) as total")
            ->groupBy('status')
            ->pluck('total', 'status');

        $confirmados = $totais['confirmado'] ?? 0;
        $ausentes    = $totais['ausente']    ?? 0;
        $pendentes   = $totais['pendente']   ?? 0;
        $total       = $confirmados + $ausentes + $pendentes;

        if ($total === 0) return "## ✅ Presenças\n\nNenhuma presença registrada.";

        $taxaConf = $total > 0 ? round(($confirmados / $total) * 100) : 0;

        return "## ✅ Resumo de Presenças\n\n"
            . "- Confirmados: **{$confirmados}** ({$taxaConf}%)\n"
            . "- Ausentes: **{$ausentes}**\n"
            . "- Pendentes: **{$pendentes}**\n"
            . "- Total registrado: **{$total}**";
    }

    private function maisFaltaram(): string
    {
        $lista = Cerimoniario::query()
            ->select('cerimoniarios.nome')
            ->selectRaw('COUNT(presencas.id) as total_ausencias')
            ->join('escala_itens', 'escala_itens.cerimoniario_id', '=', 'cerimoniarios.id')
            ->join('presencas', fn($j) => $j->on('presencas.escala_item_id', '=', 'escala_itens.id')->where('presencas.status', 'ausente'))
            ->join('escalas', fn($j) => $j->on('escalas.id', '=', 'escala_itens.escala_id')->where('escalas.ativo', true))
            ->groupBy('cerimoniarios.id', 'cerimoniarios.nome')
            ->orderByDesc('total_ausencias')
            ->limit(10)
            ->get();

        if ($lista->isEmpty()) return "## ❌ Mais Faltaram\n\nNenhuma ausência registrada.";

        $linhas = $lista->values()->map(fn($c, $i) =>
            ($i + 1) . ". **{$c->nome}** — {$c->total_ausencias} " . ($c->total_ausencias == 1 ? 'falta' : 'faltas')
        )->implode("\n");

        return "## ❌ Cerimoniários com Mais Faltas\n\n{$linhas}";
    }

    private function presencasPendentes(): string
    {
        $lista = Presenca::with(['escalaItem.cerimoniario', 'escalaItem.escala.celebracao'])
            ->where('status', 'pendente')
            ->whereHas('escalaItem.escala', fn($s) => $s->where('ativo', true))
            ->whereHas('escalaItem.escala.celebracao', fn($s) => $s->where('data', '>=', now()->toDateString()))
            ->limit(20)
            ->get();

        if ($lista->isEmpty()) return "## ⏳ Presenças Pendentes\n\nNenhuma presença pendente.";

        $linhas = $lista->map(fn($p) =>
            "- **{$p->escalaItem?->cerimoniario?->nome}** — {$p->escalaItem?->escala?->celebracao?->data?->format('d/m/Y')} às {$p->escalaItem?->escala?->celebracao?->horario}"
        )->implode("\n");

        return "## ⏳ Presenças Pendentes ({$lista->count()})\n\n{$linhas}";
    }

    // ── Treinamentos ─────────────────────────────────────────────────────

    private function proximosTreinamentos(): string
    {
        $lista = Treinamento::where('data', '>=', now()->toDateString())->orderBy('data')->limit(10)->get();
        if ($lista->isEmpty()) return "## 🎓 Próximos Treinamentos\n\nNenhum treinamento agendado.";
        $linhas = $lista->map(fn($t) => "- **{$t->data?->format('d/m/Y')}** às {$t->horario} — {$t->tema}" . ($t->local ? " ({$t->local})" : ''))->implode("\n");
        return "## 🎓 Próximos Treinamentos\n\n{$linhas}";
    }

    private function historicoTreinamentos(): string
    {
        $lista = Treinamento::orderBy('data', 'desc')->limit(10)->get();
        if ($lista->isEmpty()) return "## 🎓 Histórico de Treinamentos\n\nNenhum treinamento registrado.";
        $linhas = $lista->map(fn($t) => "- **{$t->data?->format('d/m/Y')}** — {$t->tema}" . ($t->local ? " ({$t->local})" : ''))->implode("\n");
        return "## 🎓 Histórico de Treinamentos\n\n{$linhas}";
    }

    // ── Funções / Histórico ───────────────────────────────────────────────

    private function funcoesLiturgicas(): string
    {
        $lista = Funcao::where('ativo', true)->orderBy('ordem')->get();
        if ($lista->isEmpty()) return "## ⚙️ Funções\n\nNenhuma função cadastrada.";
        $linhas = $lista->map(fn($f) => "- **{$f->titulo}**" . ($f->descricao ? " — {$f->descricao}" : ''))->implode("\n");
        return "## ⚙️ Funções Litúrgicas ({$lista->count()})\n\n{$linhas}";
    }

    private function historicoEscalas(): string
    {
        $lista = HistoricoEscala::with(['escala.celebracao', 'user'])->orderByDesc('created_at')->limit(15)->get();
        if ($lista->isEmpty()) return "## 📋 Histórico\n\nNenhuma alteração registrada.";
        $linhas = $lista->map(fn($h) =>
            "- **{$h->acao}** — Escala de {$h->escala?->celebracao?->data?->format('d/m/Y')} por {$h->user?->nome} em {$h->created_at?->format('d/m/Y H:i')}"
        )->implode("\n");
        return "## 📋 Histórico de Alterações\n\n{$linhas}";
    }
}

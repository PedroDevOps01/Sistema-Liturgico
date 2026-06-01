<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use App\Models\Escala;
use App\Models\EscalaItem;
use App\Models\Funcao;
use App\Models\Configuracao;
use App\Models\HistoricoEscala;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class EscalaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Escala::with(['celebracao', 'criador', 'escalaItens.cerimoniario', 'escalaItens.funcao']);
        if (! $request->boolean('todos')) {
            $query->where('ativo', true);
        }

        if ($request->filled('celebracao_id')) {
            $query->where('celebracao_id', $request->celebracao_id);
        }

        if ($request->filled('data_inicio')) {
            $query->whereHas('celebracao', fn ($q) => $q->where('data', '>=', $request->data_inicio));
        }

        if ($request->filled('data_fim')) {
            $query->whereHas('celebracao', fn ($q) => $q->where('data', '<=', $request->data_fim));
        }

        $escalas = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $escalas,
            'message' => 'Escalas listadas com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'celebracao_id' => 'required|exists:celebracoes,id',
            'observacao' => 'nullable|string',
            'itens' => 'array',
            'itens.*.cerimoniario_id' => 'nullable|exists:cerimoniarios,id',
            'itens.*.funcao_id' => 'nullable|exists:funcoes,id',
            'itens.*.funcao_label' => 'nullable|string|max:255',
            'itens.*.ordem' => 'integer',
        ]);

        // Check if celebracao already has an escala
        if (Escala::where('celebracao_id', $validated['celebracao_id'])->exists()) {
            return response()->json([
                'data' => null,
                'message' => 'Esta celebração já possui uma escala.',
            ], 422);
        }

        // Check for duplicate cerimoniario in same celebracao
        if (! empty($validated['itens'])) {
            $cerimoniarioIds = collect($validated['itens'])
                ->pluck('cerimoniario_id')
                ->filter()
                ->values();

            if ($cerimoniarioIds->count() !== $cerimoniarioIds->unique()->count()) {
                return response()->json([
                    'data' => null,
                    'message' => 'Não é permitido duplicar cerimoniários na mesma escala.',
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $escala = Escala::create([
                'celebracao_id' => $validated['celebracao_id'],
                'criado_por' => $request->user()->id,
                'observacao' => $validated['observacao'] ?? null,
            ]);

            if (! empty($validated['itens'])) {
                foreach ($validated['itens'] as $index => $item) {
                    EscalaItem::create([
                        'escala_id' => $escala->id,
                        'cerimoniario_id' => $item['cerimoniario_id'] ?? null,
                        'funcao_id' => $item['funcao_id'] ?? null,
                        'funcao_label' => $item['funcao_label'] ?? null,
                        'ordem' => $item['ordem'] ?? $index,
                    ]);
                }
            }

            HistoricoEscala::create([
                'escala_id' => $escala->id,
                'user_id' => $request->user()->id,
                'acao' => 'criou',
                'descricao' => 'Escala criada.',
            ]);

            DB::commit();

            $escala->load(['celebracao', 'criador', 'escalaItens.cerimoniario', 'escalaItens.funcao']);

            return response()->json([
                'data' => $escala,
                'message' => 'Escala criada com sucesso.',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(Escala $escala): JsonResponse
    {
        $escala->load([
            'celebracao',
            'criador',
            'editor',
            'escalaItens.cerimoniario',
            'escalaItens.funcao',
            'escalaItens.presenca.substituto',
            'historicos.user',
        ]);

        return response()->json([
            'data' => $escala,
            'message' => 'Escala encontrada.',
        ]);
    }

    public function update(Request $request, Escala $escala): JsonResponse
    {
        $validated = $request->validate([
            'observacao' => 'nullable|string',
            'itens' => 'array',
            'itens.*.id' => 'nullable|exists:escala_itens,id',
            'itens.*.cerimoniario_id' => 'nullable|exists:cerimoniarios,id',
            'itens.*.funcao_id' => 'nullable|exists:funcoes,id',
            'itens.*.funcao_label' => 'nullable|string|max:255',
            'itens.*.ordem' => 'integer',
        ]);

        // Check for duplicate cerimoniario
        if (! empty($validated['itens'])) {
            $cerimoniarioIds = collect($validated['itens'])
                ->pluck('cerimoniario_id')
                ->filter()
                ->values();

            if ($cerimoniarioIds->count() !== $cerimoniarioIds->unique()->count()) {
                return response()->json([
                    'data' => null,
                    'message' => 'Não é permitido duplicar cerimoniários na mesma escala.',
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $escala->update([
                'editado_por' => $request->user()->id,
                'observacao' => $validated['observacao'] ?? $escala->observacao,
            ]);

            if (isset($validated['itens'])) {
                // Delete removed items
                $incomingIds = collect($validated['itens'])->pluck('id')->filter()->values()->toArray();
                $escala->escalaItens()->whereNotIn('id', $incomingIds)->delete();

                foreach ($validated['itens'] as $index => $item) {
                    if (! empty($item['id'])) {
                        EscalaItem::where('id', $item['id'])->update([
                            'cerimoniario_id' => $item['cerimoniario_id'] ?? null,
                            'funcao_id' => $item['funcao_id'] ?? null,
                            'funcao_label' => $item['funcao_label'] ?? null,
                            'ordem' => $item['ordem'] ?? $index,
                        ]);
                    } else {
                        EscalaItem::create([
                            'escala_id' => $escala->id,
                            'cerimoniario_id' => $item['cerimoniario_id'] ?? null,
                            'funcao_id' => $item['funcao_id'] ?? null,
                            'funcao_label' => $item['funcao_label'] ?? null,
                            'ordem' => $item['ordem'] ?? $index,
                        ]);
                    }
                }
            }

            HistoricoEscala::create([
                'escala_id' => $escala->id,
                'user_id' => $request->user()->id,
                'acao' => 'editou',
                'descricao' => 'Escala editada.',
            ]);

            DB::commit();

            $escala->load(['celebracao', 'criador', 'editor', 'escalaItens.cerimoniario', 'escalaItens.funcao', 'escalaItens.presenca']);

            return response()->json([
                'data' => $escala,
                'message' => 'Escala atualizada com sucesso.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function destroy(Request $request, Escala $escala): JsonResponse
    {
        HistoricoEscala::create([
            'escala_id' => $escala->id,
            'user_id' => $request->user()->id,
            'acao' => 'inativou',
            'descricao' => 'Escala inativada.',
        ]);

        DB::table('escalas')->where('id', $escala->id)->update(['ativo' => false, 'updated_at' => now()]);

        return response()->json([
            'data' => null,
            'message' => 'Escala inativada com sucesso.',
        ]);
    }

    public function toggleAtivo(Request $request, Escala $escala): JsonResponse
    {
        $novoAtivo = ! $escala->ativo;
        DB::table('escalas')->where('id', $escala->id)->update(['ativo' => $novoAtivo, 'updated_at' => now()]);

        HistoricoEscala::create([
            'escala_id'  => $escala->id,
            'user_id'    => $request->user()->id,
            'acao'       => $novoAtivo ? 'ativou' : 'inativou',
            'descricao'  => $novoAtivo ? 'Escala reativada.' : 'Escala inativada.',
        ]);

        return response()->json([
            'data'    => Escala::find($escala->id),
            'message' => $novoAtivo ? 'Escala ativada.' : 'Escala inativada.',
        ]);
    }

    public function gerarEstrutura(Request $request): JsonResponse
    {
        $request->validate([
            'celebracao_id' => 'required|exists:celebracoes,id',
        ]);

        $celebracao = Celebracao::findOrFail($request->celebracao_id);

        $estrutura = [];

        // Special celebrations - minimal structure, admin will customize
        $especial = $celebracao->celebracao_6h
            || $celebracao->celebracao_palavra
            || $celebracao->celebracao_solene
            || $celebracao->casamento
            || $celebracao->batismo
            || $celebracao->crisma
            || $celebracao->primeira_eucaristia
            || $celebracao->adoracao_santissimo
            || $celebracao->procissao
            || $celebracao->via_sacra
            || $celebracao->exequias
            || $celebracao->vigilia_pascal
            || $celebracao->paixao_senhor
            || $celebracao->ordenacao;

        // Base: sempre começa com o Mestre
        $estrutura[] = ['funcao_id' => 1, 'ordem' => 0];

        // Celebrações normais adicionam os auxiliares
        if (! $especial) {
            $estrutura[] = ['funcao_id' => 2, 'ordem' => count($estrutura)]; // 1º Aux
            $estrutura[] = ['funcao_id' => 3, 'ordem' => count($estrutura)]; // 2º Aux
            $estrutura[] = ['funcao_id' => 4, 'ordem' => count($estrutura)]; // 3º Aux
            $estrutura[] = ['funcao_id' => 5, 'ordem' => count($estrutura)]; // 4º Aux
        }

        // Noturno sempre adiciona Turiferário (independente de ser especial)
        if ($celebracao->celebracao_noite) {
            $estrutura[] = ['funcao_id' => 6, 'ordem' => count($estrutura)];
        }

        // Respeita qtd_cerimoniarios para a base (antes de adicionar bispo)
        $qtd = $celebracao->qtd_cerimoniarios ?? count($estrutura);
        if ($qtd > 0 && $qtd < count($estrutura)) {
            $estrutura = array_slice($estrutura, 0, $qtd);
        }

        // Bispo adiciona Môr, Mitra e Bácula ALÉM do qtd base
        if ($celebracao->possui_bispo) {
            $estrutura[] = ['funcao_id' => 7, 'ordem' => count($estrutura)];
            $estrutura[] = ['funcao_id' => 8, 'ordem' => count($estrutura)];
            $estrutura[] = ['funcao_id' => 9, 'ordem' => count($estrutura)];
        }

        // Re-index ordem after slicing
        foreach ($estrutura as $i => &$item) {
            $item['ordem'] = $i;
        }
        unset($item);

        // Load funcao data
        $funcaoIds = collect($estrutura)->pluck('funcao_id')->toArray();
        $funcoes = Funcao::whereIn('id', $funcaoIds)->get()->keyBy('id');

        $resultado = collect($estrutura)->map(function ($item) use ($funcoes) {
            return [
                'funcao_id'      => $item['funcao_id'],
                'funcao'         => $funcoes[$item['funcao_id']] ?? null,
                'funcao_label'   => null,
                'cerimoniario_id'=> null,
                'cerimoniario'   => null,
                'ordem'          => $item['ordem'],
            ];
        })->values();

        return response()->json([
            'data' => [
                'celebracao' => $celebracao,
                'estrutura' => $resultado,
                'especial' => $especial,
            ],
            'message' => 'Estrutura gerada com sucesso.',
        ]);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private function abbreviateFuncao(string $label): string
    {
        $l = mb_strtolower($label);
        if (str_contains($l, 'mestre') || (str_starts_with($l, 'cerimoni') && !str_contains($l, 'aux'))) {
            return 'Cerimoniário';
        }
        if (str_contains($l, 'auxiliar 1') || str_contains($l, 'primeiro') || str_contains($l, 'microfone')) return '1ª Aux';
        if (str_contains($l, 'auxiliar 2') || str_contains($l, 'segundo')  || str_contains($l, 'missal'))    return '2ª Aux';
        if (str_contains($l, 'auxiliar 3') || str_contains($l, 'terceiro') || str_contains($l, 'leitor'))    return '3ª Aux';
        if (str_contains($l, 'auxiliar 4') || str_contains($l, 'quarto')   || str_contains($l, 'prece'))     return '4ª Aux';
        if (str_contains($l, 'auxiliar 5') || str_contains($l, 'quinto')   || str_contains($l, 'turiferário') || str_contains($l, 'turifer')) return '5ª Aux';
        return $label;
    }

    private function formatHorarioCompact(string $horario): string
    {
        [$h, $m] = array_map('intval', explode(':', substr($horario, 0, 5)));
        return $m === 0 ? "{$h}h" : "{$h}h" . str_pad($m, 2, '0', STR_PAD_LEFT);
    }

    private function getTipoCelebracao(\App\Models\Celebracao $c): string
    {
        if ($c->casamento)           return 'Casamento';
        if ($c->batismo)             return 'Batismo';
        if ($c->crisma)              return 'Crisma';
        if ($c->celebracao_palavra)  return 'Celebração da Palavra';
        if ($c->celebracao_solene)   return 'Missa Solene';
        if ($c->celebracao_6h)       return 'Missa';
        return 'Missa';
    }

    private function buildTextoEscala(Escala $escala): string
    {
        $celebracao = $escala->celebracao;
        $periodo    = mb_strtoupper($celebracao->periodo_liturgico);
        $data       = \Carbon\Carbon::parse($celebracao->data)->format('d/m');
        $horario    = $this->formatHorarioCompact($celebracao->horario);
        $tipo       = $this->getTipoCelebracao($celebracao);

        $linhas   = [];
        $linhas[] = $periodo;
        $linhas[] = "DIA {$data} - {$celebracao->periodo_liturgico}";
        $linhas[] = "{$tipo} às {$horario}";
        $linhas[] = '';

        foreach ($escala->escalaItens as $item) {
            $rawLabel = $item->funcao_label ?? ($item->funcao ? $item->funcao->titulo : null);
            $label    = $rawLabel ? $this->abbreviateFuncao($rawLabel) : 'Função';
            $nome     = $item->cerimoniario ? $item->cerimoniario->nome : 'A escalar';
            $linhas[] = "{$label}: {$nome}";
        }

        if ($escala->observacao) {
            $linhas[] = '';
            $linhas[] = "Obs: {$escala->observacao}";
        }

        return implode("\n", $linhas);
    }

    // ─── public actions ───────────────────────────────────────────────────────

    public function copiarWhatsapp(int $id): JsonResponse
    {
        $escala = Escala::with([
            'celebracao',
            'escalaItens' => fn ($q) => $q->orderBy('ordem'),
            'escalaItens.cerimoniario',
            'escalaItens.funcao',
        ])->findOrFail($id);

        return response()->json([
            'data'    => ['texto' => $this->buildTextoEscala($escala)],
            'message' => 'Texto para WhatsApp gerado com sucesso.',
        ]);
    }

    /** Check which cerimoniários are already in future scales on the same date */
    public function conflitosData(Request $request): JsonResponse
    {
        $request->validate(['data' => 'required|date']);

        // Get all escala_itens for celebrations on this date (excluding current scale if editing)
        $escalaIdExcluir = $request->escala_id ?? null;

        $ocupados = \Illuminate\Support\Facades\DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as c', 'c.id', '=', 'e.celebracao_id')
            ->where('c.data', $request->data)
            ->where('c.ativo', true)
            ->whereNull('c.deleted_at')
            ->whereNotNull('ei.cerimoniario_id')
            ->when($escalaIdExcluir, fn ($q) => $q->where('e.id', '!=', $escalaIdExcluir))
            ->select('ei.cerimoniario_id', 'c.horario', 'c.periodo_liturgico', 'e.id as escala_id')
            ->get()
            ->groupBy('cerimoniario_id')
            ->map(fn ($rows) => $rows->map(fn ($r) => [
                'horario' => substr($r->horario, 0, 5),
                'periodo_liturgico' => $r->periodo_liturgico,
                'escala_id' => $r->escala_id,
            ])->values());

        return response()->json([
            'data' => $ocupados,
            'message' => 'Conflitos verificados.',
        ]);
    }

    public function historico(Request $request): JsonResponse
    {
        $request->validate([
            'data_inicio' => 'nullable|date',
            'data_fim'    => 'nullable|date',
            'search'      => 'nullable|string|max:100',
        ]);

        $hoje   = now()->toDateString();
        $inicio = $request->data_inicio ?? now()->startOfMonth()->toDateString();
        $fim    = $request->data_fim    ?? $hoje;

        $query = Escala::with([
            'celebracao',
            'escalaItens'                     => fn ($q) => $q->orderBy('ordem'),
            'escalaItens.cerimoniario',
            'escalaItens.funcao',
            'escalaItens.presenca.substituto',
        ])
        ->where('escalas.ativo', true)
        ->join('celebracoes', 'celebracoes.id', '=', 'escalas.celebracao_id')
        ->where('celebracoes.ativo', true)
        ->whereNull('celebracoes.deleted_at')
        ->where('celebracoes.data', '<', $hoje)
        ->whereBetween('celebracoes.data', [$inicio, $fim])
        ->select('escalas.*');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('celebracoes.periodo_liturgico', 'ilike', $s)
                  ->orWhereRaw("CAST(celebracoes.data AS TEXT) ilike ?", [$s]);
            });
        }

        $escalas = $query
            ->orderByDesc('celebracoes.data')
            ->orderByDesc('celebracoes.horario')
            ->get();

        // Stats do período
        $totalEscalados  = $escalas->sum(fn ($e) => $e->escalaItens->count());
        $totalServiu     = $escalas->sum(fn ($e) => $e->escalaItens->filter(fn ($i) => $i->presenca?->status === 'serviu')->count());
        $totalFaltou     = $escalas->sum(fn ($e) => $e->escalaItens->filter(fn ($i) => $i->presenca?->status === 'faltou')->count());
        $totalSubstituido = $escalas->sum(fn ($e) => $e->escalaItens->filter(fn ($i) => $i->presenca?->status === 'substituido')->count());
        $taxaPresenca    = ($totalServiu + $totalFaltou) > 0
            ? round($totalServiu / ($totalServiu + $totalFaltou) * 100)
            : null;

        return response()->json([
            'data' => [
                'escalas' => $escalas->values(),
                'stats'   => [
                    'total_celebracoes' => $escalas->count(),
                    'total_escalados'   => $totalEscalados,
                    'serviu'            => $totalServiu,
                    'faltou'            => $totalFaltou,
                    'substituido'       => $totalSubstituido,
                    'taxa_presenca'     => $taxaPresenca,
                ],
                'periodo' => ['inicio' => $inicio, 'fim' => $fim],
            ],
            'message' => 'Histórico carregado com sucesso.',
        ]);
    }

    public function ultima(): JsonResponse
    {
        $escala = Escala::with([
            'celebracao',
            'escalaItens' => fn ($q) => $q->orderBy('ordem'),
            'escalaItens.cerimoniario',
            'escalaItens.funcao',
        ])->latest()->first();

        return response()->json([
            'data'    => $escala,
            'message' => $escala ? 'Última escala encontrada.' : 'Nenhuma escala cadastrada.',
        ]);
    }

    public function gerarPdf(int $id): Response
    {
        $escala = Escala::with([
            'celebracao',
            'escalaItens' => fn ($q) => $q->orderBy('ordem'),
            'escalaItens.cerimoniario',
            'escalaItens.funcao',
            'criador',
        ])->findOrFail($id);

        $configuracao = Configuracao::first();

        $pdf = Pdf::loadView('pdf.escala', [
            'escala' => $escala,
            'configuracao' => $configuracao,
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("escala-{$escala->id}.pdf");
    }

    public function duplicar(Request $request, int $id): JsonResponse
    {
        $escala = Escala::with('escalaItens')->findOrFail($id);

        $request->validate([
            'celebracao_id' => 'required|exists:celebracoes,id',
        ]);

        if (Escala::where('celebracao_id', $request->celebracao_id)->exists()) {
            return response()->json([
                'data' => null,
                'message' => 'Esta celebração já possui uma escala.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $novaEscala = Escala::create([
                'celebracao_id' => $request->celebracao_id,
                'criado_por' => $request->user()->id,
                'observacao' => $escala->observacao,
            ]);

            foreach ($escala->escalaItens as $item) {
                EscalaItem::create([
                    'escala_id' => $novaEscala->id,
                    'cerimoniario_id' => $item->cerimoniario_id,
                    'funcao_id' => $item->funcao_id,
                    'funcao_label' => $item->funcao_label,
                    'ordem' => $item->ordem,
                ]);
            }

            HistoricoEscala::create([
                'escala_id' => $novaEscala->id,
                'user_id' => $request->user()->id,
                'acao' => 'criou',
                'descricao' => "Escala duplicada da escala #{$escala->id}.",
            ]);

            DB::commit();

            $novaEscala->load(['celebracao', 'criador', 'escalaItens.cerimoniario', 'escalaItens.funcao']);

            return response()->json([
                'data' => $novaEscala,
                'message' => 'Escala duplicada com sucesso.',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}

<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Comunicado;
use App\Models\DataBloqueada;
use App\Models\Escala;
use App\Models\EscalaItem;
use App\Models\PedidoSubstituto;
use App\Models\Presenca;
use App\Models\Reuniao;
use App\Models\ReuniaoPresenca;
use App\Services\JanelaPresencaService;
use App\Services\NotificacaoService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembroController extends Controller
{
    public function __construct(
        private NotificacaoService $notificacao,
        private JanelaPresencaService $janelaPresenca,
    ) {
    }

    private function cerimoniario(Request $request): Cerimoniario
    {
        return $request->user();
    }

    // ── Dashboard ──────────────────────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $hoje = now()->toDateString();

        // Próximas escalas do membro (próximos 30 dias)
        $proximasEscalas = EscalaItem::with([
            'escala.celebracao',
            'funcao',
            'presenca.substituto:id,nome,foto_base64',
        ])
        ->where('cerimoniario_id', $cer->id)
        ->whereHas('escala', fn($q) => $q->where('ativo', true))
        ->whereHas('escala.celebracao', fn($q) => $q
            ->where('ativo', true)
            ->where('data', '>=', $hoje)
            ->where('data', '<=', now()->addDays(30)->toDateString())
        )
        ->get()
        ->sortBy(fn($i) => ($i->escala?->celebracao?->data ?? '') . ' ' . ($i->escala?->celebracao?->horario ?? ''))
        ->values()
        ->take(5);

        // Aniversariantes hoje
        $aniversariantes = Cerimoniario::where('ativo', true)
            ->whereNotNull('data_nascimento')
            ->whereMonth('data_nascimento', now()->month)
            ->whereDay('data_nascimento', now()->day)
            ->get(['id', 'nome', 'foto_base64', 'data_nascimento']);

        // Última celebração do membro com status de presença
        $ultimaEscala = EscalaItem::with(['escala.celebracao', 'funcao', 'presenca.substituto:id,nome,foto_base64'])
            ->where('cerimoniario_id', $cer->id)
            ->whereHas('escala.celebracao', fn($q) => $q
                ->where('ativo', true)
                ->where('data', '<', $hoje)
            )
            ->latest('id')
            ->first();

        return response()->json([
            'data' => [
                'proximas_escalas'  => $proximasEscalas,
                'aniversariantes'   => $aniversariantes,
                'ultima_escala'     => $ultimaEscala,
            ],
            'message' => 'Dashboard carregado.',
        ]);
    }

    // ── Escalas do membro ──────────────────────────────────────────────────

    public function escalas(Request $request): JsonResponse
    {
        $cer    = $this->cerimoniario($request);
        $apenas = $request->query('periodo', 'futuras'); // futuras | passadas | todas

        $query = EscalaItem::with(['escala.celebracao', 'funcao', 'presenca.substituto:id,nome,foto_base64'])
            ->where('cerimoniario_id', $cer->id)
            ->whereHas('escala', fn($q) => $q->where('ativo', true))
            ->whereHas('escala.celebracao', fn($q) => $q->where('ativo', true));

        if ($apenas === 'futuras') {
            $query->whereHas('escala.celebracao', fn($q) => $q->where('data', '>=', now()->toDateString()));
        } elseif ($apenas === 'passadas') {
            $query->whereHas('escala.celebracao', fn($q) => $q->where('data', '<', now()->toDateString()));
        }

        $itens = $query->get()->sortBy(fn($i) => ($i->escala?->celebracao?->data ?? '') . ' ' . ($i->escala?->celebracao?->horario ?? ''))->values();

        return response()->json([
            'data'    => $itens,
            'message' => 'Escalas carregadas.',
        ]);
    }

    // ── Calendário mensal ──────────────────────────────────────────────────

    public function calendario(Request $request): JsonResponse
    {
        $cer = $this->cerimoniario($request);
        $mes = (int) $request->query('mes', now()->month);
        $ano = (int) $request->query('ano', now()->year);

        $inicio = Carbon::createFromDate($ano, $mes, 1)->startOfMonth()->toDateString();
        $fim    = Carbon::createFromDate($ano, $mes, 1)->endOfMonth()->toDateString();

        $itens = EscalaItem::with(['escala.celebracao', 'funcao', 'presenca.substituto:id,nome,foto_base64'])
            ->where('cerimoniario_id', $cer->id)
            ->whereHas('escala', fn($q) => $q->where('ativo', true))
            ->whereHas('escala.celebracao', fn($q) => $q
                ->where('ativo', true)
                ->whereBetween('data', [$inicio, $fim])
            )
            ->get();

        return response()->json([
            'data'    => $itens,
            'message' => 'Calendário carregado.',
        ]);
    }

    // ── Aniversariantes ────────────────────────────────────────────────────

    public function aniversariantes(): JsonResponse
    {
        $hoje = now();

        $lista = Cerimoniario::where('ativo', true)
            ->whereNotNull('data_nascimento')
            ->get(['id', 'nome', 'foto_base64', 'data_nascimento'])
            ->map(function ($cer) use ($hoje) {
                $nasc = Carbon::parse($cer->data_nascimento);
                $aniv = $nasc->copy()->setYear($hoje->year);
                if ($aniv->lt($hoje->copy()->startOfDay())) $aniv->addYear();
                return [
                    'id'                     => $cer->id,
                    'nome'                   => $cer->nome,
                    'foto_base64'            => $cer->foto_base64,
                    'data_nascimento'        => $cer->data_nascimento,
                    'dias_para_aniversario'  => (int) $hoje->copy()->startOfDay()->diffInDays($aniv, false),
                    'idade'                  => $aniv->year - $nasc->year,
                ];
            })
            ->sortBy('dias_para_aniversario')
            ->values();

        return response()->json([
            'data'    => $lista,
            'message' => 'Aniversariantes carregados.',
        ]);
    }

    // ── Perfil ─────────────────────────────────────────────────────────────

    public function updatePerfil(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'numero'                    => 'nullable|string|max:30',
            'data_nascimento'           => 'nullable|date',
            'observacao'                => 'nullable|string|max:1000',
            'disponivel_domingo_manha'  => 'nullable|boolean',
            'disponivel_domingo_tarde'  => 'nullable|boolean',
            'disponivel_domingo_noite'  => 'nullable|boolean',
            'disponivel_semana_manha'   => 'nullable|boolean',
            'disponivel_semana_tarde'   => 'nullable|boolean',
            'disponivel_semana_noite'   => 'nullable|boolean',
            'disponivel_sabado'         => 'nullable|boolean',
        ]);

        $cer = $this->cerimoniario($request);
        $cer->update($validated);

        return response()->json([
            'data'    => $cer->fresh(),
            'message' => 'Perfil atualizado.',
        ]);
    }

    public function uploadFoto(Request $request): JsonResponse
    {
        $request->validate([
            'foto_base64' => 'nullable|string',
        ]);

        $cer = $this->cerimoniario($request);
        $cer->update(['foto_base64' => $request->foto_base64]);

        return response()->json([
            'data'    => ['foto_base64' => $request->foto_base64],
            'message' => $request->foto_base64 ? 'Foto salva.' : 'Foto removida.',
        ]);
    }

    // ── Presença do membro ─────────────────────────────────────────────────

    public function marcarPresenca(Request $request, EscalaItem $item): JsonResponse
    {
        $validated = $request->validate([
            'status'     => 'required|in:serviu,justificado',
            'observacao' => 'nullable|string|max:500',
        ]);

        $cer = $this->cerimoniario($request);

        if ((int) $item->cerimoniario_id !== $cer->id) {
            return response()->json(['message' => 'Sem permissão para registrar esta presença.'], 403);
        }

        // Não permite sobrescrever substituição
        $existente = Presenca::where('escala_item_id', $item->id)->first();
        if ($existente && $existente->status === 'substituido') {
            return response()->json(['message' => 'Você foi substituído nesta escala.'], 422);
        }

        $escala = $item->escala;

        if ($validated['status'] === 'serviu') {
            if (! $escala?->presenca_aberta) {
                return response()->json(['message' => 'A janela de presença não está aberta.'], 422);
            }
            $inicio = $this->janelaPresenca->inicioCelebracao($escala);
            if ($inicio && now()->gte($inicio)) {
                return response()->json(['message' => 'O prazo para marcar presença encerrou no início da celebração.'], 422);
            }
            $confirmado = ($existente?->status_confirmacao === 'confirmado')
                       || ($item->status_confirmacao === 'confirmado');
            if (! $confirmado) {
                return response()->json(['message' => 'Confirme sua presença antes de marcar que serviu.'], 422);
            }
        }

        if ($validated['status'] === 'justificado') {
            if ($existente && $existente->justificativa_status) {
                return response()->json(['message' => 'Você já enviou uma justificativa para esta falta — aguarde a análise do admin.'], 422);
            }

            if (empty($validated['observacao'])) {
                return response()->json(['message' => 'Descreva o motivo para justificar — a observação é obrigatória.'], 422);
            }

            $escala->load('celebracao');
            if ($escala->celebracao) {
                $inicio = Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    substr($escala->celebracao->data, 0, 10) . ' ' . $escala->celebracao->horario,
                    'America/Sao_Paulo'
                );
                // Justificar só faz sentido após a celebração ter ocorrido
                if (now()->lt($inicio)) {
                    return response()->json(['message' => 'A justificativa só pode ser enviada após o início da celebração.'], 422);
                }
            }
        }

        if ($validated['status'] === 'serviu') {
            // serviu implica confirmação; status muda na hora, sem precisar de aprovação
            $updates = [
                'status'             => 'serviu',
                'status_confirmacao' => 'confirmado',
                'observacao'         => $validated['observacao'] ?? null,
            ];
        } else {
            // Justificativa entra em análise — o status (ex: faltou) só muda para "justificado"
            // depois que o admin aprovar pelo portal admin.
            $updates = [
                'observacao'                  => $validated['observacao'],
                'justificativa_status'        => 'pendente',
                'justificativa_analisada_em'  => null,
                'justificativa_analisada_por' => null,
            ];
        }

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            $updates
        );

        if ($validated['status'] === 'justificado') {
            $funcao  = $item->funcao_label ?? $item->funcao?->titulo ?? '';
            $data    = $escala->celebracao ? $escala->celebracao->data->format('d/m/Y') : '';
            $horario = $escala->celebracao ? substr($escala->celebracao->horario, 0, 5) : '';
            $texto = "*Nova justificativa pendente*\n\n{$cer->nome} justificou falta na escala de {$data} às {$horario}"
                . ($funcao ? " ({$funcao})" : '') . ".\nMotivo: \"{$validated['observacao']}\"\n\n"
                . 'Avalie no Portal Admin > Justificativas.';
            $this->notificacao->alertarAdminWhatsapp($texto, 'justificativa_pendente', $presenca);
        }

        return response()->json([
            'data'    => $presenca,
            'message' => $validated['status'] === 'serviu'
                ? 'Presença registrada com sucesso.'
                : 'Justificativa enviada para análise do admin.',
        ]);
    }

    public function confirmarPresenca(Request $request, EscalaItem $item): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        if ((int) $item->cerimoniario_id !== $cer->id) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $existente = Presenca::where('escala_item_id', $item->id)->first();
        if ($existente && $existente->status === 'substituido') {
            return response()->json(['message' => 'Você foi substituído nesta escala.'], 422);
        }

        $escala = $item->escala;

        // Janela aberta = membro está presente na celebração; permite confirmar mesmo após o horário de início
        if (! $escala->presenca_aberta) {
            $escala->load('celebracao');
            if ($escala->celebracao) {
                $inicio = Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    substr($escala->celebracao->data, 0, 10) . ' ' . $escala->celebracao->horario,
                    'America/Sao_Paulo'
                );
                if (now()->gte($inicio)) {
                    return response()->json(['message' => 'Não é possível confirmar a escala após o início da celebração.'], 422);
                }
            }
        }

        $presenca = Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            ['status_confirmacao' => 'confirmado']
        );

        return response()->json([
            'data'    => $presenca,
            'message' => 'Presença confirmada!',
        ]);
    }

    // ── Presenças do dia (portal membro) ──────────────────────────────────

    private function autoAbrirJanela(Escala $escala): void
    {
        if ($this->janelaPresenca->deveAbrirAutomaticamente($escala)) {
            $this->janelaPresenca->abrir($escala);
        }
    }

    private function autoFecharJanela(Escala $escala): void
    {
        if ($this->janelaPresenca->deveEncerrar($escala)) {
            $this->janelaPresenca->encerrar($escala);
        }
    }

    public function presencasDia(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $hoje = now()->toDateString();

        $meusItens = EscalaItem::with([
            'escala.celebracao',
            'escala.itens' => fn($q) => $q->with([
                'cerimoniario:id,nome,foto_base64',
                'funcao:id,titulo',
                'presenca',
            ])->orderBy('ordem'),
            'funcao',
            'presenca',
        ])
        ->where('cerimoniario_id', $cer->id)
        ->whereHas('escala.celebracao', fn($q) => $q
            ->where('ativo', true)
            ->whereDate('data', $hoje)
        )
        ->get()
        ->sortBy(fn($i) => ($i->escala?->celebracao?->horario ?? ''));

        // Rede de segurança: abre/fecha a janela mesmo se o comando agendado ainda não rodou
        foreach ($meusItens as $item) {
            $this->autoAbrirJanela($item->escala);
            $this->autoFecharJanela($item->escala);
            $item->escala->refresh();
        }

        $data = $meusItens->map(function ($item) {
            $fl = strtolower($item->funcao_label ?? $item->funcao?->titulo ?? '');
            $podeControlar = str_contains($fl, 'mestre');

            $todosItens = $item->escala->itens->map(fn($i) => [
                'id'           => $i->id,
                'funcao_label' => $i->funcao_label,
                'funcao'       => $i->funcao ? ['titulo' => $i->funcao->titulo] : null,
                'cerimoniario' => $i->cerimoniario ? [
                    'id'          => $i->cerimoniario->id,
                    'nome'        => $i->cerimoniario->nome,
                    'foto_base64' => $i->cerimoniario->foto_base64,
                ] : null,
                'presenca' => $i->presenca ? [
                    'status'                => $i->presenca->status,
                    'justificativa_status'  => $i->presenca->justificativa_status,
                ] : null,
            ]);

            $confirmado = ($item->presenca?->status_confirmacao === 'confirmado')
                       || ($item->status_confirmacao === 'confirmado');

            return [
                'meu_item_id'       => $item->id,
                'pode_controlar'    => $podeControlar,
                'minha_presenca'    => $item->presenca ? [
                    'status'               => $item->presenca->status,
                    'justificativa_status' => $item->presenca->justificativa_status,
                ] : null,
                'minha_confirmacao' => $confirmado ? 'confirmado' : null,
                'minha_funcao'      => $item->funcao_label ?? $item->funcao?->titulo ?? '—',
                'escala' => [
                    'id'                  => $item->escala->id,
                    'presenca_aberta'     => (bool) $item->escala->presenca_aberta,
                    'presenca_aberta_em'  => $item->escala->presenca_aberta_em,
                    'presenca_fechada_em' => $item->escala->presenca_fechada_em,
                    'celebracao'          => $item->escala->celebracao,
                    'todos_itens'         => $todosItens,
                ],
            ];
        });

        return response()->json([
            'data'    => $data->values(),
            'message' => 'Presenças do dia.',
        ]);
    }

    public function abrirPresenca(Request $request, Escala $escala): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        $item = EscalaItem::where('escala_id', $escala->id)
            ->where('cerimoniario_id', $cer->id)
            ->first();

        if (! $item) {
            return response()->json(['message' => 'Você não está nessa escala.'], 403);
        }

        $fl = strtolower($item->funcao_label ?? $item->funcao?->titulo ?? '');
        if (! str_contains($fl, 'mestre')) {
            return response()->json(['message' => 'Apenas o mestre da escala pode controlar a janela.'], 403);
        }

        $inicio = $this->janelaPresenca->inicioCelebracao($escala);
        if ($inicio) {
            if (now()->lt($inicio->copy()->subHour())) {
                return response()->json(['message' => 'A janela pode ser aberta a partir de 1 hora antes da celebração.'], 422);
            }
            if (now()->gte($inicio)) {
                return response()->json(['message' => 'A celebração já começou; a janela não pode mais ser aberta.'], 422);
            }
        }

        $this->janelaPresenca->abrir($escala);

        return response()->json(['message' => 'Janela de presença aberta.']);
    }

    public function fecharPresenca(Request $request, Escala $escala): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        $item = EscalaItem::where('escala_id', $escala->id)
            ->where('cerimoniario_id', $cer->id)
            ->first();

        if (! $item) {
            return response()->json(['message' => 'Você não está nessa escala.'], 403);
        }

        $fl = strtolower($item->funcao_label ?? $item->funcao?->titulo ?? '');
        if (! str_contains($fl, 'mestre')) {
            return response()->json(['message' => 'Apenas o mestre da escala pode controlar a janela.'], 403);
        }

        $this->janelaPresenca->encerrar($escala);

        return response()->json(['message' => 'Janela fechada. Faltas automáticas aplicadas.']);
    }

    // ── Comunicados ────────────────────────────────────────────────────────

    public function comunicados(Request $request): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        $lista = Comunicado::where('ativo', true)
            ->where(fn ($q) => $q->whereNull('expira_em')->orWhere('expira_em', '>', now()))
            ->where(fn ($q) => $q->whereNull('cerimoniario_id')->orWhere('cerimoniario_id', $cer->id))
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $lista, 'message' => 'Comunicados.']);
    }

    // ── Reuniões do membro ─────────────────────────────────────────────────

    public function reunioesMembro(Request $request): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        $reunioes = Reuniao::withTrashed()->where('deleted_at', null)
            ->with(['presencas' => fn($q) => $q->where('cerimoniario_id', $cer->id)])
            ->orderBy('data', 'desc')
            ->take(30)
            ->get()
            ->map(fn($r) => [
                'id'             => $r->id,
                'data'           => $r->data,
                'horario'        => $r->horario,
                'tema'           => $r->tema,
                'local'          => $r->local,
                'tipo'           => $r->tipo,
                'observacao'     => $r->observacao,
                'minha_presenca' => $r->presencas->first(),
            ]);

        return response()->json(['data' => $reunioes, 'message' => 'Reuniões.']);
    }

    public function marcarPresencaReuniao(Request $request, Reuniao $reuniao): JsonResponse
    {
        $validated = $request->validate([
            'status'     => 'required|in:presente,ausente,justificado',
            'observacao' => 'nullable|string|max:500',
        ]);

        $cer = $this->cerimoniario($request);

        $presenca = ReuniaoPresenca::updateOrCreate(
            ['reuniao_id' => $reuniao->id, 'cerimoniario_id' => $cer->id],
            ['status' => $validated['status'], 'observacao' => $validated['observacao'] ?? null]
        );

        return response()->json(['data' => $presenca, 'message' => 'Presença registrada.']);
    }

    // ── Treinamentos do membro ─────────────────────────────────────────────

    public function treinamentosMembro(Request $request): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        $treinamentos = \App\Models\Treinamento::withTrashed()->where('deleted_at', null)
            ->with(['presencas' => fn($q) => $q->where('cerimoniario_id', $cer->id)])
            ->orderBy('data', 'desc')
            ->take(30)
            ->get()
            ->map(fn($t) => [
                'id'               => $t->id,
                'data'             => $t->data,
                'horario'          => $t->horario,
                'tema'             => $t->tema,
                'local'            => $t->local,
                'funcoes'          => $t->funcoes,
                'periodo_liturgico'=> $t->periodo_liturgico,
                'observacao'       => $t->observacao,
                'minha_presenca'   => $t->presencas->first(),
            ]);

        return response()->json(['data' => $treinamentos, 'message' => 'Treinamentos.']);
    }

    public function marcarPresencaTreinamento(Request $request, \App\Models\Treinamento $treinamento): JsonResponse
    {
        $validated = $request->validate([
            'status'     => 'required|in:presente,ausente,justificado',
            'observacao' => 'nullable|string|max:500',
        ]);

        $cer = $this->cerimoniario($request);

        $presenca = \App\Models\TreinamentoPresenca::updateOrCreate(
            ['treinamento_id' => $treinamento->id, 'cerimoniario_id' => $cer->id],
            ['status' => $validated['status'], 'observacao' => $validated['observacao'] ?? null]
        );

        return response()->json(['data' => $presenca, 'message' => 'Presença registrada.']);
    }

    // ── Contatos ───────────────────────────────────────────────────────────

    public function contatos(): JsonResponse
    {
        $lista = Cerimoniario::where('ativo', true)
            ->orderBy('nome')
            ->get(['id', 'nome', 'foto_base64', 'numero', 'mestre']);

        return response()->json(['data' => $lista, 'message' => 'Contatos.']);
    }

    // ── Estatísticas pessoais ──────────────────────────────────────────────

    public function estatisticas(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $hoje = now()->toDateString();

        $itens = EscalaItem::with(['escala.celebracao', 'presenca'])
            ->where('cerimoniario_id', $cer->id)
            ->whereHas('escala.celebracao', fn($q) => $q->where('ativo', true))
            ->get();

        $porAno = [];
        $porMes = [];
        $anoAtual = (int) now()->year;

        foreach ($itens as $item) {
            $data = $item->escala?->celebracao?->data;
            if (! $data) continue;
            $ano = (int) substr($data, 0, 4);
            $mes = (int) substr($data, 5, 2);
            $status = $item->presenca?->status ?? '';

            if (! isset($porAno[$ano])) $porAno[$ano] = ['total' => 0, 'serviu' => 0, 'faltou' => 0, 'justificado' => 0];
            $porAno[$ano]['total']++;
            if ($status && isset($porAno[$ano][$status])) $porAno[$ano][$status]++;

            if ($ano === $anoAtual) {
                if (! isset($porMes[$mes])) $porMes[$mes] = ['total' => 0, 'serviu' => 0];
                $porMes[$mes]['total']++;
                if ($status === 'serviu') $porMes[$mes]['serviu']++;
            }
        }

        ksort($porAno);
        ksort($porMes);

        return response()->json([
            'data' => [
                'por_ano'           => $porAno,
                'por_mes'           => $porMes,
                'total_geral'       => $itens->count(),
                'registrado_desde'  => $cer->created_at?->format('Y-m-d'),
            ],
            'message' => 'Estatísticas.',
        ]);
    }

    // ── Datas bloqueadas ───────────────────────────────────────────────────

    public function datasBlockeadas(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $dados = DataBloqueada::where('cerimoniario_id', $cer->id)
            ->where('data', '>=', now()->toDateString())
            ->orderBy('data')
            ->get();

        return response()->json(['data' => $dados, 'message' => 'Datas bloqueadas.']);
    }

    public function bloquearData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data'     => 'required|date|after_or_equal:today',
            'data_fim' => 'required|date|after_or_equal:data',
            'motivo'   => 'nullable|string|max:200',
        ]);

        $cer = $this->cerimoniario($request);

        $registro = DataBloqueada::create([
            'cerimoniario_id' => $cer->id,
            'data'            => $validated['data'],
            'data_fim'        => $validated['data_fim'],
            'motivo'          => $validated['motivo'] ?? null,
        ]);

        $periodo = $validated['data'] === $validated['data_fim']
            ? $validated['data']
            : "{$validated['data']} a {$validated['data_fim']}";
        $motivo = $validated['motivo'] ?? 'não informado';
        $this->notificacao->alertarAdminWhatsapp(
            "*Bloqueio de período solicitado*\n\n{$cer->nome} bloqueou o período {$periodo}.\nMotivo: {$motivo}",
            'bloqueio_periodo',
            $registro
        );

        return response()->json(['data' => $registro, 'message' => 'Período bloqueado.'], 201);
    }

    public function desbloquearData(Request $request, DataBloqueada $data): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        if ((int) $data->cerimoniario_id !== $cer->id) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $data->delete();

        return response()->json(['message' => 'Data desbloqueada.']);
    }

    // ── Substituições ──────────────────────────────────────────────────────

    public function escalasSubstituicao(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $hoje = now()->toDateString();

        $itens = EscalaItem::with([
                'escala.celebracao',
                'funcao',
                'pedidoSubstituto.voluntario:id,nome',
                'presenca.substituto:id,nome',
            ])
            ->where('cerimoniario_id', $cer->id)
            ->whereHas('escala.celebracao', fn($q) => $q
                ->where('ativo', true)
                ->where('data', '>=', $hoje)
            )
            ->get()
            ->sortBy(fn($i) => $i->escala?->celebracao?->data)
            ->values();

        return response()->json(['data' => $itens, 'message' => 'Substituições.']);
    }

    public function pedirSubstituto(Request $request, EscalaItem $item): JsonResponse
    {
        $validated = $request->validate(['motivo' => 'nullable|string|max:500']);
        $cer = $this->cerimoniario($request);

        if ((int) $item->cerimoniario_id !== $cer->id) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $pedido = PedidoSubstituto::updateOrCreate(
            ['escala_item_id' => $item->id],
            ['motivo' => $validated['motivo'] ?? null, 'resolvido' => false]
        );

        $item->loadMissing('escala.celebracao');
        $celebracao = $item->escala?->celebracao;
        $quando = $celebracao ? \Carbon\Carbon::parse($celebracao->data)->format('d/m/Y') . ' ' . substr($celebracao->horario, 0, 5) : 'data não identificada';
        $motivo = $validated['motivo'] ?? 'não informado';
        $this->notificacao->alertarAdminWhatsapp(
            "*Pedido de substituto*\n\n{$cer->nome} pediu substituto na escala de {$quando}.\nMotivo: {$motivo}",
            'pedido_substituto',
            $pedido
        );

        return response()->json(['data' => $pedido, 'message' => 'Pedido registrado.'], 201);
    }

    public function cancelarSubstituto(Request $request, EscalaItem $item): JsonResponse
    {
        $cer = $this->cerimoniario($request);

        if ((int) $item->cerimoniario_id !== $cer->id) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        PedidoSubstituto::where('escala_item_id', $item->id)->delete();

        return response()->json(['message' => 'Pedido cancelado.']);
    }

    public function pedidosAbertos(Request $request): JsonResponse
    {
        $cer  = $this->cerimoniario($request);
        $hoje = now()->toDateString();

        $eagerLoad = [
            'escalaItem.escala.celebracao',
            'escalaItem.funcao',
            'escalaItem.cerimoniario',
            'voluntario',
        ];

        $futuros = fn($q) => $q
            ->where('ativo', true)
            ->where('data', '>=', $hoje);

        // Pedidos abertos de outros membros
        $abertos = PedidoSubstituto::with($eagerLoad)
            ->where('resolvido', false)
            ->whereHas('escalaItem', fn($q) => $q->where('cerimoniario_id', '!=', $cer->id))
            ->whereHas('escalaItem.escala.celebracao', $futuros)
            ->orderBy('created_at', 'desc')
            ->get();

        // Pedidos resolvidos onde eu sou o voluntário (minhas substituições confirmadas)
        $minhasConfirmadas = PedidoSubstituto::with($eagerLoad)
            ->where('resolvido', true)
            ->where('voluntario_cerimoniario_id', $cer->id)
            ->whereHas('escalaItem.escala.celebracao', $futuros)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => [
                'abertos'           => $abertos,
                'minhas_confirmadas'=> $minhasConfirmadas,
            ],
            'message' => 'Pedidos carregados.',
        ]);
    }

    public function voluntariar(Request $request, EscalaItem $item): JsonResponse
    {
        $cer    = $this->cerimoniario($request);
        $pedido = PedidoSubstituto::where('escala_item_id', $item->id)
                    ->where('resolvido', false)
                    ->first();

        if (! $pedido) {
            return response()->json(['message' => 'Pedido não encontrado.'], 404);
        }

        if ((int) $item->cerimoniario_id === $cer->id) {
            return response()->json(['message' => 'Você não pode se voluntariar para a própria escala.'], 422);
        }

        // Preserva status_confirmacao original (link ou manual) para o relatório saber se confirmou antes de pedir sub
        $presencaOriginal = Presenca::where('escala_item_id', $item->id)->first();
        $confirmacaoOriginal = $presencaOriginal?->status_confirmacao ?? $item->status_confirmacao;

        Presenca::updateOrCreate(
            ['escala_item_id' => $item->id],
            [
                'status'             => 'substituido',
                'substituto_id'      => $cer->id,
                'status_confirmacao' => $confirmacaoOriginal,
            ]
        );

        // Marca o pedido como resolvido
        $pedido->update([
            'resolvido'                  => true,
            'voluntario_cerimoniario_id' => $cer->id,
        ]);

        return response()->json(['data' => $pedido, 'message' => 'Substituição confirmada! Você está na escala.']);
    }

    public function cancelarVoluntario(Request $request, EscalaItem $item): JsonResponse
    {
        $cer    = $this->cerimoniario($request);
        $pedido = PedidoSubstituto::where('escala_item_id', $item->id)
                    ->where('voluntario_cerimoniario_id', $cer->id)
                    ->where('resolvido', true)
                    ->first();

        if (! $pedido) {
            return response()->json(['message' => 'Substituição não encontrada.'], 404);
        }

        // Remove a presença registrada para este voluntário
        Presenca::where('escala_item_id', $item->id)
            ->where('status', 'substituido')
            ->where('substituto_id', $cer->id)
            ->delete();

        // Reabre o pedido (cerimoniario_id do item nunca foi alterado, não há nada a reverter)
        $pedido->update([
            'resolvido'                  => false,
            'voluntario_cerimoniario_id' => null,
        ]);

        return response()->json(['message' => 'Substituição desfeita.']);
    }

    // ── Documentos ─────────────────────────────────────────────────────────

    public function documentos(): JsonResponse
    {
        $lista = \App\Models\Documento::where('ativo', true)
            ->orderBy('tipo')
            ->orderBy('titulo')
            ->get(['id', 'titulo', 'descricao', 'tipo', 'arquivo_nome', 'mime_type', 'created_at']);

        return response()->json(['data' => $lista, 'message' => 'Documentos.']);
    }

    public function downloadDocumento(\App\Models\Documento $documento): JsonResponse
    {
        if (! $documento->ativo) {
            return response()->json(['message' => 'Documento não encontrado.'], 404);
        }

        return response()->json([
            'data'    => [
                'arquivo_base64' => $documento->arquivo_base64,
                'mime_type'      => $documento->mime_type,
                'arquivo_nome'   => $documento->arquivo_nome,
            ],
            'message' => 'Download.',
        ]);
    }
}

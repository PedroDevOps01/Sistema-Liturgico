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
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    private string $apiKey;
    private string $model = 'gemini-2.5-flash';
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key', '');
    }

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'messages'           => 'required|array|min:1',
            'messages.*.role'    => 'required|in:user,assistant',
            'messages.*.content' => 'required|string',
        ]);

        if (empty($this->apiKey)) {
            return response()->json([
                'message' => 'Chave da API Gemini não configurada. Adicione GEMINI_API_KEY no .env do servidor.',
            ], 503);
        }

        $reply = $this->callGemini($request->input('messages'));

        return response()->json(['message' => $reply]);
    }

    // ── Orquestrador Gemini (function-calling loop) ───────────────────────

    private function callGemini(array $messages): string
    {
        // Converte formato {role, content} → formato Gemini {role, parts}
        $contents = array_map(fn($m) => [
            'role'  => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]],
        ], $messages);

        for ($i = 0; $i < 6; $i++) {
            $response = Http::timeout(30)
                ->post("{$this->baseUrl}/{$this->model}:generateContent?key={$this->apiKey}", [
                    'system_instruction' => ['parts' => [['text' => $this->systemPrompt()]]],
                    'tools'              => [['function_declarations' => $this->tools()]],
                    'contents'           => $contents,
                    'generation_config'  => ['temperature' => 0.2, 'max_output_tokens' => 2048],
                ]);

            if ($response->failed()) {
                $err = $response->json('error.message') ?? $response->status();
                return "Erro na API Gemini: {$err}";
            }

            $candidate = $response->json('candidates.0');
            $parts      = $candidate['content']['parts'] ?? [];

            // Verifica se há chamadas de função
            $functionCalls = array_filter($parts, fn($p) => isset($p['functionCall']));

            if (!empty($functionCalls)) {
                // Garante que args seja objeto ao reenviar (PHP decoda {} como [], que serializa como array JSON)
                $normalizedParts = array_map(function ($p) {
                    if (isset($p['functionCall']['args']) && $p['functionCall']['args'] === []) {
                        $p['functionCall']['args'] = new \stdClass();
                    }
                    return $p;
                }, $parts);

                $contents[] = ['role' => 'model', 'parts' => $normalizedParts];

                // Executa cada função e adiciona resultados
                $responseParts = [];
                foreach ($functionCalls as $part) {
                    $fc     = $part['functionCall'];
                    $result = $this->runTool($fc['name'], (array)($fc['args'] ?? []));
                    $responseParts[] = [
                        'function_response' => [
                            'name'     => $fc['name'],
                            'response' => ['result' => $result],
                        ],
                    ];
                }
                $contents[] = ['role' => 'user', 'parts' => $responseParts];
                continue;
            }

            // Resposta final em texto
            foreach ($parts as $part) {
                if (isset($part['text'])) return $part['text'];
            }

            break;
        }

        return 'Não consegui processar sua solicitação.';
    }

    // ── Executor de ferramentas ───────────────────────────────────────────

    private function runTool(string $name, array $input): mixed
    {
        return match ($name) {
            'buscar_escalas'       => $this->toolEscalas($input),
            'buscar_cerimoniarios' => $this->toolCerimoniarios($input),
            'buscar_celebracoes'   => $this->toolCelebracoes($input),
            'buscar_estatisticas'  => $this->toolEstatisticas(),
            'detalhar_escala'      => $this->toolDetalharEscala($input),
            'buscar_treinamentos'         => $this->toolTreinamentos($input),
            'ranking_cerimoniarios'       => $this->toolRankingCerimoniarios($input),
            'presencas_cerimoniario'      => $this->toolPresencasCerimoniario($input),
            'cerimoniarios_disponiveis'   => $this->toolCerimoniáriosDisponiveis($input),
            'buscar_funcoes'              => $this->toolFuncoes(),
            'historico_escala'            => $this->toolHistoricoEscala($input),
            default                       => ['erro' => "Ferramenta '$name' não encontrada"],
        };
    }

    private function toolEscalas(array $in): array
    {
        $q = Escala::with(['celebracao', 'itens.cerimoniario', 'itens.funcao'])
            ->where('ativo', true);

        if (!empty($in['data_inicio'])) {
            $q->whereHas('celebracao', fn($s) => $s->where('data', '>=', $in['data_inicio']));
        }
        if (!empty($in['data_fim'])) {
            $q->whereHas('celebracao', fn($s) => $s->where('data', '<=', $in['data_fim']));
        }

        return $q->orderByHas('celebracao', fn($s) => $s->orderBy('data'))
            ->limit((int)($in['limite'] ?? 10))
            ->get()
            ->map(fn($e) => [
                'id'               => $e->id,
                'data'             => $e->celebracao?->data?->format('d/m/Y'),
                'horario'          => $e->celebracao?->horario,
                'periodo_liturgico'=> $e->celebracao?->periodo_liturgico,
                'cerimoniarios'    => $e->itens->map(fn($i) => [
                    'nome'  => $i->cerimoniario?->nome,
                    'funcao'=> $i->funcao_label ?? $i->funcao?->titulo,
                ])->values()->toArray(),
            ])->toArray();
    }

    private function toolCerimoniarios(array $in): array
    {
        $q = Cerimoniario::query();

        if (isset($in['ativo']))                    $q->where('ativo', (bool)$in['ativo']);
        if (!empty($in['nome']))                    $q->where('nome', 'ilike', '%'.$in['nome'].'%');
        if (!empty($in['disponivel_domingo_manha'])) $q->where('disponivel_domingo_manha', true);
        if (!empty($in['disponivel_domingo_tarde'])) $q->where('disponivel_domingo_tarde', true);
        if (!empty($in['disponivel_domingo_noite'])) $q->where('disponivel_domingo_noite', true);

        return $q->orderBy('nome')
            ->limit((int)($in['limite'] ?? 50))
            ->get()
            ->map(fn($c) => [
                'id'                     => $c->id,
                'nome'                   => $c->nome,
                'numero'                 => $c->numero,
                'ativo'                  => $c->ativo,
                'experiente'             => $c->experiente,
                'indisponivel_temporario'=> $c->indisponivel_temporario,
                'disponivel_domingo_manha'=> $c->disponivel_domingo_manha,
                'disponivel_domingo_tarde'=> $c->disponivel_domingo_tarde,
                'disponivel_domingo_noite'=> $c->disponivel_domingo_noite,
                'disponivel_semana_manha' => $c->disponivel_semana_manha,
                'disponivel_semana_tarde' => $c->disponivel_semana_tarde,
                'disponivel_semana_noite' => $c->disponivel_semana_noite,
                'disponivel_sabado'       => $c->disponivel_sabado,
            ])->toArray();
    }

    private function toolCelebracoes(array $in): array
    {
        $q = Celebracao::query()->where('ativo', true);

        if (!empty($in['data_inicio']))        $q->where('data', '>=', $in['data_inicio']);
        if (!empty($in['data_fim']))           $q->where('data', '<=', $in['data_fim']);
        if (!empty($in['periodo_liturgico']))  $q->where('periodo_liturgico', $in['periodo_liturgico']);
        if (!empty($in['sem_escala']))         $q->whereDoesntHave('escala');
        if (!empty($in['com_escala']))         $q->whereHas('escala');
        if (!empty($in['casamento']))          $q->where('casamento', true);
        if (!empty($in['batismo']))            $q->where('batismo', true);
        if (!empty($in['final_de_semana']))    $q->where('final_de_semana', true);

        return $q->orderBy('data')
            ->limit((int)($in['limite'] ?? 30))
            ->get()
            ->map(fn($c) => [
                'id'                 => $c->id,
                'data'               => $c->data?->format('d/m/Y'),
                'horario'            => $c->horario,
                'periodo_liturgico'  => $c->periodo_liturgico,
                'qtd_cerimoniarios'  => $c->qtd_cerimoniarios,
                'tem_escala'         => $c->escala()->exists(),
                'final_de_semana'    => $c->final_de_semana,
                'casamento'          => $c->casamento,
                'batismo'            => $c->batismo,
                'crisma'             => $c->crisma,
                'primeira_eucaristia'=> $c->primeira_eucaristia,
                'adoracao_santissimo'=> $c->adoracao_santissimo,
                'procissao'          => $c->procissao,
                'via_sacra'          => $c->via_sacra,
                'celebracao_solene'  => $c->celebracao_solene,
                'possui_bispo'       => $c->possui_bispo,
            ])->toArray();
    }

    private function toolPresencasCerimoniario(array $in): array
    {
        $q = Presenca::query()
            ->with(['escalaItem.cerimoniario', 'escalaItem.escala.celebracao'])
            ->whereHas('escalaItem.escala', fn($s) => $s->where('ativo', true));

        if (!empty($in['cerimoniario_id']))   $q->whereHas('escalaItem', fn($s) => $s->where('cerimoniario_id', $in['cerimoniario_id']));
        if (!empty($in['cerimoniario_nome'])) $q->whereHas('escalaItem.cerimoniario', fn($s) => $s->where('nome', 'ilike', '%'.$in['cerimoniario_nome'].'%'));
        if (!empty($in['status']))            $q->where('status', $in['status']);
        if (!empty($in['data_inicio']))       $q->whereHas('escalaItem.escala.celebracao', fn($s) => $s->where('data', '>=', $in['data_inicio']));
        if (!empty($in['data_fim']))          $q->whereHas('escalaItem.escala.celebracao', fn($s) => $s->where('data', '<=', $in['data_fim']));

        $presencas = $q->limit((int)($in['limite'] ?? 30))->get();

        // Agrega por cerimoniário se não filtrou por um específico
        if (empty($in['cerimoniario_id']) && empty($in['cerimoniario_nome'])) {
            return $presencas
                ->groupBy(fn($p) => $p->escalaItem?->cerimoniario?->nome)
                ->map(fn($group, $nome) => [
                    'cerimoniario' => $nome,
                    'total'        => $group->count(),
                    'confirmados'  => $group->where('status', 'confirmado')->count(),
                    'ausentes'     => $group->where('status', 'ausente')->count(),
                    'pendentes'    => $group->where('status', 'pendente')->count(),
                ])
                ->values()->toArray();
        }

        return $presencas->map(fn($p) => [
            'cerimoniario' => $p->escalaItem?->cerimoniario?->nome,
            'data'         => $p->escalaItem?->escala?->celebracao?->data?->format('d/m/Y'),
            'horario'      => $p->escalaItem?->escala?->celebracao?->horario,
            'status'       => $p->status,
            'observacao'   => $p->observacao,
        ])->toArray();
    }

    private function toolCerimoniáriosDisponiveis(array $in): array
    {
        $periodo = $in['periodo'] ?? null; // domingo_manha, domingo_tarde, domingo_noite, semana_manha, semana_tarde, semana_noite, sabado
        $q = Cerimoniario::where('ativo', true)->where('indisponivel_temporario', false);

        if ($periodo) {
            $campo = 'disponivel_' . $periodo;
            $q->where($campo, true);
        }

        return $q->orderBy('nome')->get()->map(fn($c) => [
            'id'         => $c->id,
            'nome'       => $c->nome,
            'numero'     => $c->numero,
            'experiente' => $c->experiente,
        ])->toArray();
    }

    private function toolFuncoes(): array
    {
        return Funcao::where('ativo', true)->orderBy('ordem')->get()
            ->map(fn($f) => [
                'id'      => $f->id,
                'titulo'  => $f->titulo,
                'descricao'=> $f->descricao,
                'ordem'   => $f->ordem,
            ])->toArray();
    }

    private function toolHistoricoEscala(array $in): array
    {
        $q = HistoricoEscala::with(['escala.celebracao', 'user'])
            ->orderByDesc('created_at');

        if (!empty($in['escala_id'])) $q->where('escala_id', $in['escala_id']);
        if (!empty($in['acao']))      $q->where('acao', $in['acao']);

        return $q->limit((int)($in['limite'] ?? 15))->get()->map(fn($h) => [
            'escala_id'  => $h->escala_id,
            'data_celebracao' => $h->escala?->celebracao?->data?->format('d/m/Y'),
            'acao'       => $h->acao,
            'descricao'  => $h->descricao,
            'usuario'    => $h->user?->nome,
            'quando'     => $h->created_at?->format('d/m/Y H:i'),
        ])->toArray();
    }

    private function toolEstatisticas(): array
    {
        return [
            'cerimoniarios_ativos'    => Cerimoniario::where('ativo', true)->count(),
            'cerimoniarios_inativos'  => Cerimoniario::where('ativo', false)->count(),
            'indisponiveis_temporario'=> Cerimoniario::where('indisponivel_temporario', true)->count(),
            'experientes'             => Cerimoniario::where('experiente', true)->where('ativo', true)->count(),
            'total_escalas'           => Escala::where('ativo', true)->count(),
            'total_celebracoes'       => Celebracao::where('ativo', true)->count(),
            'celebracoes_sem_escala'  => Celebracao::where('ativo', true)->whereDoesntHave('escala')->count(),
            'total_treinamentos'      => Treinamento::count(),
        ];
    }

    private function toolDetalharEscala(array $in): array
    {
        $escala = Escala::with(['celebracao', 'itens.cerimoniario', 'itens.funcao', 'itens.presenca'])
            ->find($in['id'] ?? 0);

        if (!$escala) return ['erro' => 'Escala não encontrada'];

        return [
            'id'               => $escala->id,
            'data'             => $escala->celebracao?->data?->format('d/m/Y'),
            'horario'          => $escala->celebracao?->horario,
            'periodo_liturgico'=> $escala->celebracao?->periodo_liturgico,
            'observacao'       => $escala->observacao,
            'cerimoniarios'    => $escala->itens->map(fn($i) => [
                'nome'    => $i->cerimoniario?->nome,
                'funcao'  => $i->funcao_label ?? $i->funcao?->titulo,
                'presenca'=> $i->presenca?->status,
            ])->values()->toArray(),
        ];
    }

    private function toolTreinamentos(array $in): array
    {
        $q = Treinamento::query();
        if (!empty($in['data_inicio'])) $q->where('data', '>=', $in['data_inicio']);

        return $q->orderBy('data', 'desc')
            ->limit((int)($in['limite'] ?? 10))
            ->get()
            ->map(fn($t) => [
                'id'               => $t->id,
                'data'             => $t->data?->format('d/m/Y'),
                'horario'          => $t->horario,
                'tema'             => $t->tema,
                'local'            => $t->local,
                'periodo_liturgico'=> $t->periodo_liturgico,
            ])->toArray();
    }

    private function toolRankingCerimoniarios(array $in): array
    {
        return Cerimoniario::query()
            ->select('cerimoniarios.*')
            ->selectRaw('COUNT(escalas.id) as total_servicos')
            ->leftJoin('escala_itens', 'escala_itens.cerimoniario_id', '=', 'cerimoniarios.id')
            ->leftJoin('escalas', function ($j) {
                $j->on('escalas.id', '=', 'escala_itens.escala_id')->where('escalas.ativo', true);
            })
            ->when(!empty($in['data_inicio']), function ($q) use ($in) {
                $q->leftJoin('celebracoes', 'celebracoes.id', '=', 'escalas.celebracao_id')
                  ->where('celebracoes.data', '>=', $in['data_inicio']);
            })
            ->when(!empty($in['data_fim']), function ($q) use ($in) {
                $q->whereHas('escalaItens.escala.celebracao', fn($s) => $s->where('data', '<=', $in['data_fim']));
            })
            ->where('cerimoniarios.ativo', true)
            ->groupBy('cerimoniarios.id')
            ->orderByDesc('total_servicos')
            ->limit((int)($in['limite'] ?? 10))
            ->get()
            ->map(fn($c) => [
                'posicao'        => null,
                'nome'           => $c->nome,
                'numero'         => $c->numero,
                'total_servicos' => (int)$c->total_servicos,
                'experiente'     => $c->experiente,
            ])
            ->values()
            ->map(function ($c, $i) {
                $c['posicao'] = $i + 1;
                return $c;
            })
            ->toArray();
    }

    // ── System prompt e declarações de ferramentas ────────────────────────

    private function systemPrompt(): string
    {
        $hoje = now()->locale('pt_BR')->isoFormat('dddd, D [de] MMMM [de] YYYY');
        return <<<PROMPT
Você é o **Sávio**, assistente virtual da Escala Litúrgica da Paróquia São José Operário de Araturi. Inspirado em São Domingos Sávio.

Hoje é {$hoje}.

Use as funções disponíveis para consultar o banco de dados e responder perguntas sobre escalas, cerimoniários, celebrações, estatísticas e treinamentos.

Instruções:
- Responda sempre em português brasileiro
- Use markdown: **negrito**, listas com `-`, seja objetivo
- Para datas relativas ("próxima semana", "este mês") calcule a partir de hoje
- Quando não houver dados, diga claramente
PROMPT;
    }

    private function tools(): array
    {
        return [
            [
                'name'        => 'buscar_escalas',
                'description' => 'Busca escalas litúrgicas com filtros de data. Retorna cerimoniários escalados e funções.',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'data_inicio'=> ['type' => 'string', 'description' => 'Data início YYYY-MM-DD'],
                        'data_fim'   => ['type' => 'string', 'description' => 'Data fim YYYY-MM-DD'],
                        'limite'     => ['type' => 'integer', 'description' => 'Máximo de resultados (padrão 10)'],
                    ],
                ],
            ],
            [
                'name'        => 'buscar_cerimoniarios',
                'description' => 'Lista cerimoniários com filtros de nome, disponibilidade e status.',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'nome'                    => ['type' => 'string',  'description' => 'Filtro parcial por nome'],
                        'ativo'                   => ['type' => 'boolean', 'description' => 'true=ativos, false=inativos'],
                        'disponivel_domingo_manha'=> ['type' => 'boolean'],
                        'disponivel_domingo_tarde'=> ['type' => 'boolean'],
                        'disponivel_domingo_noite'=> ['type' => 'boolean'],
                        'limite'                  => ['type' => 'integer'],
                    ],
                ],
            ],
            [
                'name'        => 'buscar_estatisticas',
                'description' => 'Retorna estatísticas gerais do sistema.',
                'parameters'  => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name'        => 'detalhar_escala',
                'description' => 'Detalhes completos de uma escala por ID, com presenças.',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'id' => ['type' => 'integer', 'description' => 'ID da escala'],
                    ],
                    'required'  => ['id'],
                ],
            ],
            [
                'name'        => 'buscar_treinamentos',
                'description' => 'Lista treinamentos dos cerimoniários.',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'data_inicio'=> ['type' => 'string'],
                        'limite'     => ['type' => 'integer'],
                    ],
                ],
            ],
            [
                'name'        => 'ranking_cerimoniarios',
                'description' => 'Ranking de cerimoniários que mais serviram nas escalas ativas. Use para "quem mais serviu", "top cerimoniários", "mais participações".',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'data_inicio'=> ['type' => 'string', 'description' => 'Filtrar a partir desta data YYYY-MM-DD'],
                        'data_fim'   => ['type' => 'string', 'description' => 'Filtrar até esta data YYYY-MM-DD'],
                        'limite'     => ['type' => 'integer', 'description' => 'Quantos retornar (padrão 10)'],
                    ],
                ],
            ],
            [
                'name'        => 'buscar_celebracoes',
                'description' => 'Lista celebrações com filtros avançados: sem escala, com escala, casamento, batismo, final de semana, período litúrgico. Use sem_escala=true para "celebrações sem escala".',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'data_inicio'      => ['type' => 'string', 'description' => 'Data início YYYY-MM-DD'],
                        'data_fim'         => ['type' => 'string', 'description' => 'Data fim YYYY-MM-DD'],
                        'periodo_liturgico'=> ['type' => 'string', 'description' => 'Ex: Tempo Comum, Advento, Quaresma, Páscoa'],
                        'sem_escala'       => ['type' => 'boolean', 'description' => 'true = só celebrações SEM escala associada'],
                        'com_escala'       => ['type' => 'boolean', 'description' => 'true = só celebrações COM escala'],
                        'casamento'        => ['type' => 'boolean', 'description' => 'Filtrar celebrações de casamento'],
                        'batismo'          => ['type' => 'boolean', 'description' => 'Filtrar celebrações de batismo'],
                        'final_de_semana'  => ['type' => 'boolean', 'description' => 'Filtrar só finais de semana'],
                        'limite'           => ['type' => 'integer'],
                    ],
                ],
            ],
            [
                'name'        => 'presencas_cerimoniario',
                'description' => 'Consulta presenças/ausências de cerimoniários nas escalas. Retorna confirmados, ausentes e pendentes. Use para "quem faltou", "presenças de X", "taxa de presença".',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'cerimoniario_id'  => ['type' => 'integer', 'description' => 'ID do cerimoniário específico'],
                        'cerimoniario_nome'=> ['type' => 'string',  'description' => 'Nome parcial do cerimoniário'],
                        'status'           => ['type' => 'string',  'description' => 'confirmado | ausente | pendente'],
                        'data_inicio'      => ['type' => 'string'],
                        'data_fim'         => ['type' => 'string'],
                        'limite'           => ['type' => 'integer'],
                    ],
                ],
            ],
            [
                'name'        => 'cerimoniarios_disponiveis',
                'description' => 'Lista cerimoniários disponíveis (ativos, não indisponíveis temporariamente) para um período específico. Use para "quem pode servir domingo manhã", "disponíveis para sábado".',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'periodo'=> [
                            'type'        => 'string',
                            'description' => 'Período: domingo_manha, domingo_tarde, domingo_noite, semana_manha, semana_tarde, semana_noite, sabado',
                        ],
                    ],
                ],
            ],
            [
                'name'        => 'buscar_funcoes',
                'description' => 'Lista todas as funções/ministérios litúrgicos cadastrados (ex: Acólito, Leitor, Cruciferário). Use quando perguntarem sobre funções ou ministérios.',
                'parameters'  => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name'        => 'historico_escala',
                'description' => 'Histórico de alterações em escalas: criações, edições, exclusões e quem realizou cada ação.',
                'parameters'  => [
                    'type'      => 'object',
                    'properties'=> [
                        'escala_id'=> ['type' => 'integer', 'description' => 'ID de uma escala específica'],
                        'acao'     => ['type' => 'string',  'description' => 'Tipo de ação: criado, editado, excluido'],
                        'limite'   => ['type' => 'integer'],
                    ],
                ],
            ],
        ];
    }
}

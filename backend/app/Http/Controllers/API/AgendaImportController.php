<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AgendaImportController extends Controller
{
    private string $apiKey;
    private string $model = 'gemini-2.5-flash';
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    // Mantido em sincronia manual com TIPO_CELEBRACAO_ORDEM em frontend/src/lib/celebracaoUtils.ts
    private const TIPOS = [
        'Missa', 'Casamento', 'Batismo', 'Crisma', 'Primeira Eucaristia',
        'Quinta Eucarística', 'Tríduo', 'Ordenação', 'Exéquias', 'Vigília Pascal', 'Paixão do Senhor',
        'Corpus Christi', 'Missa Crismal', 'Missa Pontifical', 'Adoração ao Santíssimo',
        'Procissão', 'Via-Sacra', 'Celebração da Palavra', 'Missa Solene',
    ];

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key', '');
    }

    public function extrair(Request $request): JsonResponse
    {
        set_time_limit(100);

        $validated = $request->validate([
            'arquivo_base64' => 'required|string|max:14000000',
            'mime_type'      => 'required|string|in:application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif',
            'mes'            => 'required|integer|between:1,12',
            'ano'            => 'required|integer|between:2020,2100',
        ]);

        if (empty($this->apiKey)) {
            return response()->json([
                'message' => 'Chave da API Gemini não configurada. Adicione GEMINI_API_KEY no .env do servidor.',
            ], 503);
        }

        $base64 = preg_replace('/^data:[^;]+;base64,/', '', $validated['arquivo_base64']);
        $mes = (int) $validated['mes'];
        $ano = (int) $validated['ano'];

        $inicio = microtime(true);

        try {
            $response = Http::timeout(90)->post("{$this->baseUrl}/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => [[
                    'role'  => 'user',
                    'parts' => [
                        ['text' => $this->prompt($mes, $ano)],
                        ['inline_data' => ['mime_type' => $validated['mime_type'], 'data' => $base64]],
                    ],
                ]],
                'generation_config' => [
                    'temperature'        => 0.1,
                    'max_output_tokens'  => 8192,
                    'response_mime_type' => 'application/json',
                    'response_schema'    => $this->responseSchema(),
                ],
            ]);
        } catch (ConnectionException $e) {
            return response()->json([
                'message' => 'Tempo esgotado ao processar o arquivo. Tente novamente ou cadastre manualmente.',
            ], 504);
        }

        if ($response->failed()) {
            $erro = $response->json('error.message') ?? "HTTP {$response->status()}";
            return response()->json([
                'message' => "Erro na API Gemini: {$erro}",
            ], 502);
        }

        $texto = $response->json('candidates.0.content.parts.0.text');
        $itens = json_decode((string) $texto, true);

        if (! is_array($itens)) {
            Log::warning('AgendaImportController: resposta Gemini não é JSON válido', [
                'trecho' => mb_substr((string) $texto, 0, 500),
            ]);

            return response()->json([
                'message' => 'Não foi possível interpretar a agenda enviada. Tente novamente ou cadastre manualmente.',
            ], 422);
        }

        $celebracoes = $this->explodeHorarios($itens, $mes, $ano);

        Log::info('AgendaImportController: extração concluída', [
            'mime_type'      => $validated['mime_type'],
            'tamanho_bytes'  => strlen($base64),
            'mes'            => $mes,
            'ano'            => $ano,
            'itens_ia'       => count($itens),
            'linhas_geradas' => count($celebracoes),
            'duracao_ms'     => (int) ((microtime(true) - $inicio) * 1000),
        ]);

        return response()->json([
            'data'    => ['celebracoes' => $celebracoes],
            'message' => count($celebracoes) . ' celebração(ões) identificada(s) na agenda.',
        ]);
    }

    /** Expande cada item {dia, tipo, horarios[], observacao} em N linhas de preview */
    private function explodeHorarios(array $itens, int $mes, int $ano): array
    {
        $linhas = [];

        foreach ($itens as $item) {
            $dia = (int) ($item['dia'] ?? 0);
            $tipo = in_array($item['tipo'] ?? null, self::TIPOS, true) ? $item['tipo'] : 'Missa';
            $observacao = is_string($item['observacao'] ?? null) ? $item['observacao'] : null;
            $horarios = is_array($item['horarios'] ?? null) ? $item['horarios'] : [];

            if ($dia < 1 || $dia > 31 || empty($horarios)) {
                continue;
            }

            foreach ($horarios as $horario) {
                if (! preg_match('/^(\d{1,2}):(\d{2})/', (string) $horario, $m)) {
                    continue;
                }

                $linhas[] = [
                    'data'       => sprintf('%04d-%02d-%02d', $ano, $mes, $dia),
                    'horario'    => sprintf('%02d:%02d', (int) $m[1], (int) $m[2]),
                    'tipo'       => $tipo,
                    'observacao' => $observacao,
                ];
            }
        }

        return $linhas;
    }

    private function responseSchema(): array
    {
        return [
            'type'  => 'ARRAY',
            'items' => [
                'type'       => 'OBJECT',
                'properties' => [
                    'dia'        => ['type' => 'INTEGER', 'description' => 'Dia do mês, de 1 a 31'],
                    'tipo'       => ['type' => 'STRING', 'enum' => self::TIPOS],
                    'horarios'   => [
                        'type'  => 'ARRAY',
                        'items' => ['type' => 'STRING'],
                        'description' => 'Horários no formato HH:mm (24h). Uma célula como "Missas: 7h e 9h30" gera UM item com horarios: ["07:00","09:30"], nunca dois itens separados.',
                    ],
                    'observacao' => ['type' => 'STRING', 'description' => 'Texto curto complementar, ex: nome do celebrante ou dos noivos'],
                ],
                'required' => ['dia', 'tipo', 'horarios'],
            ],
        ];
    }

    private function prompt(int $mes, int $ano): string
    {
        $meses = [1=>'janeiro',2=>'fevereiro',3=>'março',4=>'abril',5=>'maio',6=>'junho',
            7=>'julho',8=>'agosto',9=>'setembro',10=>'outubro',11=>'novembro',12=>'dezembro'];
        $mesNome = $meses[$mes] ?? (string) $mes;

        return <<<PROMPT
Você vai analisar a imagem/PDF de uma "Agenda Paroquial" — uma grade de calendário mensal (colunas
DOMINGO a SÁBADO, uma célula de texto livre por dia) referente a {$mesNome} de {$ano}.

Cada célula do dia mistura, no mesmo bloco de texto, celebrações litúrgicas reais com dezenas de
outros compromissos administrativos/pastorais da paróquia. Sua tarefa é extrair APENAS as
celebrações litúrgicas que exigem equipe de cerimoniários/acólitos servindo no altar, ignorando
todo o resto.

INCLUIR (celebrações litúrgicas reais, sempre com horário):
- Missa(s) — ex: "Missa às 6h. (Pe. Diêgo)", "Missas: 7h e 9h30", "Missa Meio-dia", "Missa na Paróquia às 19h30"
- Casamento — ex: "Casamento às 17h", "Casamentos: Ítalo e Laurícia - 17h / Raimundo e Márcia - 19h" (cada casamento é uma linha separada)
- Batismo, Crisma, Primeira Eucaristia
- IMPORTANTE — Quinta Eucarística: sempre que o texto contiver literalmente "Quinta de Adoração" ou
  "Quinta Eucarística" (normalmente às quintas-feiras, com ou sem nome de diácono/padre ao lado),
  use tipo="Quinta Eucarística". NUNCA classifique esse evento como "Adoração ao Santíssimo" — mesmo
  sendo tecnicamente uma adoração, a característica correta cadastrada no sistema é "Quinta
  Eucarística" e tem prioridade sobre "Adoração ao Santíssimo" nesse caso específico. Esse evento
  quase nunca tem horário escrito ao lado no texto original, mas SEMPRE ocorre às 19:30 — use
  horarios: ["19:30"] mesmo sem horário explícito, nunca descarte por falta de horário.
- Ordenação, Exéquias, Vigília Pascal, Paixão do Senhor, Corpus Christi
- Missa Crismal, Missa Pontifical, Procissão, Via-Sacra
- Adoração ao Santíssimo — apenas quando for uma adoração eucarística SEM ser a "Quinta de Adoração"
  semanal (que já é classificada como Quinta Eucarística acima)
- Celebração da Palavra, Missa Solene
- Missa dos Casais e variações semelhantes de missa temática — tratar como "Missa"
- Tríduo — cada dia de um tríduo é uma celebração própria, ex: "1º Dia - Tríduo de São Bento - 19h30",
  "2º Dia - Tríduo de N. Sra. Perp. Socorro - 19h30" — cada um desses vira um item tipo "Tríduo" no
  seu respectivo dia e horário, mesmo sem a palavra "Missa" explícita.

IGNORAR (compromissos administrativos/pastorais, NÃO são celebrações a cadastrar):
- Terço (das Mulheres, dos Homens, em Família)
- Folga do Padre e dos Funcionários
- Reuniões (Conselho de Pastoral, Setorial, etc.), Palestras, Cursos preparatórios (ECC), Encontrões
- Aconselhamento, Atendimento (ex: "Atendimento às 9h30")
- Viagens do padre/diácono
- Caminhadas, arraiás, celebrações de grupos que não são missa/sacramento
- Qualquer evento que aconteça em OUTRA comunidade, capela ou paróquia — ex: "Festa de N.Sra. do
  Carmo - Croatá", "Festa de Sto. Inácio de Loiola - Planalto Vitória" — mesmo que pareça uma missa,
  se o local não é a igreja matriz/sede, IGNORE.
- Novenas que não sejam explicitamente uma Missa e não sejam um Tríduo (ex: uma novena solta sem
  "Missa" nem "Tríduo" no texto deve ser ignorada).

REGRAS DE FORMATO:
- Para cada dia com celebração, agrupe por tipo: se o mesmo dia tem vários horários do MESMO tipo
  (ex: "Missas: 7h; 9h30; 17h e 19h"), retorne UM item com horarios contendo todos os horários —
  NUNCA duplique o item inteiro por horário.
- Se o mesmo dia tem tipos DIFERENTES (ex: "Missas: 7h; 9h30; 17h" + "Casamento às 17h"), retorne
  itens separados, um por tipo.
- Horários sempre no formato 24h "HH:mm" (ex: "06:00", "19:30", "9h" vira "09:00", "Meio-dia" vira "12:00").
- Use exatamente os valores do enum de "tipo" fornecido no schema — nunca invente um tipo novo.
- Ignore nomes de padres/diáconos entre parênteses para decidir o tipo (não indicam tipo diferente
  de Missa); podem ir em "observacao" se curto.
- Se não houver NENHUMA celebração identificável, retorne um array vazio [].
PROMPT;
    }
}

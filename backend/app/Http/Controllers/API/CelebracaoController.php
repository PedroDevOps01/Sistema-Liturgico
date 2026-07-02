<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CelebracaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Celebracao::with('escala');
        if (! $request->boolean('todos')) {
            $query->where('ativo', true);
        }

        if ($request->filled('data')) {
            $query->where('data', $request->data);
        }

        if ($request->filled('data_inicio')) {
            $query->where('data', '>=', $request->data_inicio);
        }

        if ($request->filled('data_fim')) {
            $query->where('data', '<=', $request->data_fim);
        }

        if ($request->filled('periodo_liturgico')) {
            $query->where('periodo_liturgico', $request->periodo_liturgico);
        }

        if ($request->has('celebracao_noite')) {
            $query->where('celebracao_noite', filter_var($request->celebracao_noite, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('tipo')) {
            $tipo = $request->tipo;
            if (in_array($tipo, ['casamento', 'batismo', 'crisma', 'celebracao_solene', 'celebracao_palavra', 'celebracao_6h'])) {
                $query->where($tipo, true);
            }
        }

        $celebracoes = $query->orderBy('data')->orderBy('horario')->get();

        return response()->json([
            'data' => $celebracoes,
            'message' => 'Celebrações listadas com sucesso.',
        ]);
    }

    private function validateCelebracaoFields(): array
    {
        return [
            'data' => 'required|date',
            'horario' => 'required|string',
            'periodo_liturgico' => 'required|string|max:255',
            'qtd_cerimoniarios' => 'integer|min:1',
            'celebracao_noite' => 'boolean',
            'possui_bispo' => 'boolean',
            'celebracao_6h' => 'boolean',
            'celebracao_palavra' => 'boolean',
            'celebracao_solene' => 'boolean',
            'casamento' => 'boolean',
            'batismo' => 'boolean',
            'crisma' => 'boolean',
            'primeira_eucaristia' => 'boolean',
            'quinta_eucaristica' => 'boolean',
            'triduo' => 'boolean',
            'adoracao_santissimo' => 'boolean',
            'procissao' => 'boolean',
            'via_sacra' => 'boolean',
            'exequias' => 'boolean',
            'vigilia_pascal' => 'boolean',
            'paixao_senhor' => 'boolean',
            'ordenacao' => 'boolean',
            'santa_missa' => 'boolean',
            'missa_crismal' => 'boolean',
            'corpus_christi' => 'boolean',
            'missa_pontifical' => 'boolean',
            'cor_liturgica' => 'nullable|string',
            'final_de_semana' => 'boolean',
            'observacao' => 'nullable|string',
        ];
    }

    private function applyAutoNoite(array &$validated): void
    {
        if (! isset($validated['celebracao_noite']) && isset($validated['horario'])) {
            $hora = (int) explode(':', $validated['horario'])[0];
            $validated['celebracao_noite'] = $hora >= 17;
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->validateCelebracaoFields());
        $this->applyAutoNoite($validated);

        $celebracao = Celebracao::create($validated);

        return response()->json([
            'data' => $celebracao,
            'message' => 'Celebração criada com sucesso.',
        ], 201);
    }

    /** Batch creation for weekend group */
    public function storeBatch(Request $request): JsonResponse
    {
        $request->validate([
            'celebracoes' => 'required|array|min:1|max:10',
            'celebracoes.*.data' => 'required|date',
            'celebracoes.*.horario' => 'required|string',
            'celebracoes.*.periodo_liturgico' => 'required|string|max:255',
            'celebracoes.*.qtd_cerimoniarios' => 'integer|min:1',
            'celebracoes.*.celebracao_noite' => 'boolean',
            'celebracoes.*.possui_bispo' => 'boolean',
            'celebracoes.*.celebracao_6h' => 'boolean',
            'celebracoes.*.celebracao_palavra' => 'boolean',
            'celebracoes.*.celebracao_solene' => 'boolean',
            'celebracoes.*.casamento' => 'boolean',
            'celebracoes.*.batismo' => 'boolean',
            'celebracoes.*.crisma' => 'boolean',
            'celebracoes.*.observacao' => 'nullable|string',
        ]);

        // Use the date of the first celebration as group id
        $groupId = $request->celebracoes[0]['data'];

        $created = [];
        foreach ($request->celebracoes as $cel) {
            $cel['final_de_semana'] = true;
            $cel['weekend_group_id'] = $groupId;
            if (! isset($cel['celebracao_noite'])) {
                $hora = (int) explode(':', $cel['horario'])[0];
                $cel['celebracao_noite'] = $hora >= 17;
            }
            $created[] = Celebracao::create($cel);
        }

        return response()->json([
            'data' => $created,
            'message' => count($created) . ' celebrações criadas com sucesso.',
        ], 201);
    }

    /** Import em lote (CSV ou extração via IA) — cada item validado/criado independentemente */
    public function importar(Request $request): JsonResponse
    {
        $request->validate(['celebracoes' => 'required|array|min:1|max:500']);

        $criadas = [];
        $puladas = [];
        $erros = [];

        foreach ($request->input('celebracoes', []) as $i => $item) {
            $validator = Validator::make(is_array($item) ? $item : [], $this->validateCelebracaoFields());

            if ($validator->fails()) {
                $erros[] = ['indice' => $i, 'erros' => $validator->errors()->toArray()];
                continue;
            }

            $validated = $validator->validated();

            $duplicada = Celebracao::where('ativo', true)
                ->where('data', $validated['data'])
                ->where('horario', $validated['horario'])
                ->exists();

            if ($duplicada) {
                $puladas[] = [
                    'indice' => $i,
                    'motivo' => "Já existe celebração em {$validated['data']} às {$validated['horario']}",
                ];
                continue;
            }

            $this->applyAutoNoite($validated);
            $criadas[] = Celebracao::create($validated);
        }

        return response()->json([
            'data' => compact('criadas', 'puladas', 'erros'),
            'message' => count($criadas) . ' criada(s), ' . count($puladas) . ' pulada(s), ' . count($erros) . ' com erro(s).',
        ], 201);
    }

    /** Get all celebrations from the same weekend group */
    public function porGrupo(Request $request): JsonResponse
    {
        $request->validate(['group_id' => 'required|string']);

        $celebracoes = Celebracao::with('escala')
            ->where('weekend_group_id', $request->group_id)
            ->orderBy('horario')
            ->get();

        return response()->json([
            'data' => $celebracoes,
            'message' => 'Celebrações do grupo carregadas.',
        ]);
    }

    public function show(Celebracao $celebracao): JsonResponse
    {
        $celebracao->load('escala.escalaItens.cerimoniario', 'escala.escalaItens.funcao', 'escala.criador');

        return response()->json([
            'data' => $celebracao,
            'message' => 'Celebração encontrada.',
        ]);
    }

    public function update(Request $request, Celebracao $celebracao): JsonResponse
    {
        $rules = $this->validateCelebracaoFields();
        $rules = array_map(fn ($r) => str_replace('required|', 'sometimes|', $r), $rules);
        $validated = $request->validate($rules);

        if (isset($validated['horario']) && ! isset($validated['celebracao_noite'])) {
            $hora = (int) explode(':', $validated['horario'])[0];
            $validated['celebracao_noite'] = $hora >= 17;
        }

        $celebracao->update($validated);

        return response()->json([
            'data' => $celebracao->fresh(),
            'message' => 'Celebração atualizada com sucesso.',
        ]);
    }

    public function destroy(Celebracao $celebracao): JsonResponse
    {
        $celebracao->update(['ativo' => false]);

        return response()->json([
            'data' => null,
            'message' => 'Celebração inativada com sucesso.',
        ]);
    }

    public function toggleAtivo(Celebracao $celebracao): JsonResponse
    {
        $celebracao->update(['ativo' => ! $celebracao->ativo]);

        return response()->json([
            'data'    => $celebracao->fresh(),
            'message' => $celebracao->ativo ? 'Celebração ativada.' : 'Celebração inativada.',
        ]);
    }

    public function semEscala(): JsonResponse
    {
        $celebracoes = Celebracao::whereDoesntHave('escala')
            ->where('ativo', true)
            ->orderBy('data')
            ->orderBy('horario')
            ->get();

        return response()->json([
            'data' => $celebracoes,
            'message' => 'Celebrações sem escala listadas com sucesso.',
        ]);
    }
}

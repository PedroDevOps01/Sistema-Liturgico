<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Treinamento;
use App\Models\TreinamentoPresenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TreinamentoController extends Controller
{
    public function index(): JsonResponse
    {
        $treinamentos = Treinamento::with([
            'presencas',
            'presencas.cerimoniario',
        ])
        ->orderByDesc('data')
        ->orderByDesc('horario')
        ->get();

        return response()->json([
            'data'    => $treinamentos,
            'message' => 'Treinamentos listados com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data'              => 'required|date',
            'horario'           => 'required|string',
            'tema'              => 'required|string|max:255',
            'local'             => 'nullable|string|max:255',
            'funcoes'           => 'nullable|array',
            'funcoes.*'         => 'string',
            'periodo_liturgico' => 'nullable|string|max:100',
            'observacao'        => 'nullable|string',
            'cerimoniarios'     => 'nullable|array',
            'cerimoniarios.*'   => 'exists:cerimoniarios,id',
        ]);

        $cerimoniarios = $validated['cerimoniarios'] ?? [];
        unset($validated['cerimoniarios']);

        DB::beginTransaction();
        try {
            $treinamento = Treinamento::create($validated);

            foreach ($cerimoniarios as $cerId) {
                TreinamentoPresenca::create([
                    'treinamento_id'  => $treinamento->id,
                    'cerimoniario_id' => $cerId,
                ]);
            }

            DB::commit();

            $treinamento->load(['presencas', 'presencas.cerimoniario']);

            return response()->json([
                'data'    => $treinamento,
                'message' => 'Treinamento criado com sucesso.',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(Treinamento $treinamento): JsonResponse
    {
        $treinamento->load(['presencas', 'presencas.cerimoniario']);

        return response()->json([
            'data'    => $treinamento,
            'message' => 'Treinamento encontrado.',
        ]);
    }

    public function update(Request $request, Treinamento $treinamento): JsonResponse
    {
        $validated = $request->validate([
            'data'              => 'sometimes|date',
            'horario'           => 'sometimes|string',
            'tema'              => 'sometimes|string|max:255',
            'local'             => 'nullable|string|max:255',
            'funcoes'           => 'nullable|array',
            'funcoes.*'         => 'string',
            'periodo_liturgico' => 'nullable|string|max:100',
            'observacao'        => 'nullable|string',
            'cerimoniarios'     => 'nullable|array',
            'cerimoniarios.*'   => 'exists:cerimoniarios,id',
        ]);

        $cerimoniarios = isset($validated['cerimoniarios']) ? $validated['cerimoniarios'] : null;
        unset($validated['cerimoniarios']);

        DB::beginTransaction();
        try {
            $treinamento->update($validated);

            if ($cerimoniarios !== null) {
                $existingIds = $treinamento->presencas()->pluck('cerimoniario_id')->toArray();
                $newIds      = array_diff($cerimoniarios, $existingIds);
                $removeIds   = array_diff($existingIds, $cerimoniarios);

                foreach ($newIds as $cerId) {
                    TreinamentoPresenca::create([
                        'treinamento_id'  => $treinamento->id,
                        'cerimoniario_id' => $cerId,
                    ]);
                }
                if (! empty($removeIds)) {
                    TreinamentoPresenca::where('treinamento_id', $treinamento->id)
                        ->whereIn('cerimoniario_id', $removeIds)
                        ->delete();
                }
            }

            DB::commit();

            $treinamento->load(['presencas', 'presencas.cerimoniario']);

            return response()->json([
                'data'    => $treinamento,
                'message' => 'Treinamento atualizado com sucesso.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function destroy(Treinamento $treinamento): JsonResponse
    {
        $treinamento->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Treinamento removido com sucesso.',
        ]);
    }

    public function updatePresenca(Request $request, Treinamento $treinamento, Cerimoniario $cerimoniario): JsonResponse
    {
        $validated = $request->validate([
            'status'     => 'nullable|in:presente,ausente,justificado',
            'observacao' => 'nullable|string',
        ]);

        $presenca = TreinamentoPresenca::updateOrCreate(
            [
                'treinamento_id'  => $treinamento->id,
                'cerimoniario_id' => $cerimoniario->id,
            ],
            $validated
        );

        return response()->json([
            'data'    => $presenca->load('cerimoniario'),
            'message' => 'Presença registrada.',
        ]);
    }

    public function convite(Treinamento $treinamento): JsonResponse
    {
        $data    = \Carbon\Carbon::parse($treinamento->data)->locale('pt_BR')->isoFormat('DD/MM/YYYY (dddd)');
        $horario = substr($treinamento->horario, 0, 5);
        $funcoes = ! empty($treinamento->funcoes) ? implode(', ', $treinamento->funcoes) : null;

        $linhas = ['🎓 *TREINAMENTO DE CERIMONIÁRIOS*', ''];
        $linhas[] = "📅 *Data:* {$data}";
        $linhas[] = "⏰ *Horário:* {$horario}";
        if ($treinamento->local)             $linhas[] = "📍 *Local:* {$treinamento->local}";
        if ($treinamento->periodo_liturgico) $linhas[] = "📖 *Período:* {$treinamento->periodo_liturgico}";
        if ($funcoes)                        $linhas[] = "🎯 *Funções:* {$funcoes}";
        $linhas[] = '';
        $linhas[] = "📚 *Tema:* {$treinamento->tema}";
        if ($treinamento->observacao) {
            $linhas[] = '';
            $linhas[] = $treinamento->observacao;
        }
        $linhas[] = '';
        $linhas[] = 'Por favor, confirme sua presença respondendo esta mensagem.';
        $linhas[] = '';
        $linhas[] = 'Que Deus abençoe a todos! 🙏';

        return response()->json([
            'data'    => ['texto' => implode("\n", $linhas)],
            'message' => 'Convite gerado.',
        ]);
    }
}

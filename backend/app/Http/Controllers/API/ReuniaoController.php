<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Reuniao;
use App\Models\ReuniaoPresenca;
use App\Services\NotificacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReuniaoController extends Controller
{
    public function __construct(private NotificacaoService $notificacao)
    {
    }

    public function index(): JsonResponse
    {
        $reunioes = Reuniao::with([
            'presencas',
            'presencas.cerimoniario',
        ])
        ->orderByDesc('data')
        ->orderByDesc('horario')
        ->get();

        return response()->json([
            'data'    => $reunioes,
            'message' => 'Reuniões listadas com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data'         => 'required|date',
            'horario'      => 'required|string',
            'tema'         => 'required|string|max:255',
            'local'        => 'nullable|string|max:255',
            'tipo'         => 'nullable|string|in:ordinaria,extraordinaria,formacao,planejamento,outra',
            'observacao'   => 'nullable|string',
            'cerimoniarios' => 'nullable|array',
            'cerimoniarios.*' => 'exists:cerimoniarios,id',
        ]);

        $cerimoniarios = $validated['cerimoniarios'] ?? [];
        unset($validated['cerimoniarios']);

        DB::beginTransaction();
        try {
            $reuniao = Reuniao::create($validated);

            foreach ($cerimoniarios as $cerId) {
                ReuniaoPresenca::create([
                    'reuniao_id'      => $reuniao->id,
                    'cerimoniario_id' => $cerId,
                ]);
            }

            DB::commit();
            $reuniao->load(['presencas', 'presencas.cerimoniario']);

            $this->enviarConvites($reuniao, $cerimoniarios);

            return response()->json([
                'data'    => $reuniao,
                'message' => 'Reunião criada com sucesso.',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /** Envia o convite automaticamente para os cerimoniários convidados. */
    private function enviarConvites(Reuniao $reuniao, array $cerimoniarioIds): void
    {
        if (empty($cerimoniarioIds)) {
            return;
        }

        $texto = $this->buildConviteTexto($reuniao);

        Cerimoniario::whereIn('id', $cerimoniarioIds)->get()->each(
            fn (Cerimoniario $c) => $this->notificacao->enviarParaCerimoniario($c, $texto, 'reuniao', $reuniao)
        );
    }

    public function show(Reuniao $reuniao): JsonResponse
    {
        $reuniao->load(['presencas', 'presencas.cerimoniario']);

        return response()->json([
            'data'    => $reuniao,
            'message' => 'Reunião encontrada.',
        ]);
    }

    public function update(Request $request, Reuniao $reuniao): JsonResponse
    {
        $validated = $request->validate([
            'data'            => 'sometimes|date',
            'horario'         => 'sometimes|string',
            'tema'            => 'sometimes|string|max:255',
            'local'           => 'nullable|string|max:255',
            'tipo'            => 'nullable|string|in:ordinaria,extraordinaria,formacao,planejamento,outra',
            'observacao'      => 'nullable|string',
            'cerimoniarios'   => 'nullable|array',
            'cerimoniarios.*' => 'exists:cerimoniarios,id',
        ]);

        $cerimoniarios = isset($validated['cerimoniarios']) ? $validated['cerimoniarios'] : null;
        unset($validated['cerimoniarios']);

        // Captura o ID antes do update para garantir que não seja perdido
        $reuniaoId = $reuniao->getKey();

        DB::beginTransaction();
        try {
            $reuniao->update($validated);

            if ($cerimoniarios !== null) {
                $existingIds = ReuniaoPresenca::where('reuniao_id', $reuniaoId)
                    ->pluck('cerimoniario_id')
                    ->toArray();

                $newIds    = array_diff($cerimoniarios, $existingIds);
                $removeIds = array_diff($existingIds, $cerimoniarios);

                foreach ($newIds as $cerId) {
                    ReuniaoPresenca::create([
                        'reuniao_id'      => $reuniaoId,
                        'cerimoniario_id' => $cerId,
                    ]);
                }
                if (! empty($removeIds)) {
                    ReuniaoPresenca::where('reuniao_id', $reuniaoId)
                        ->whereIn('cerimoniario_id', $removeIds)
                        ->delete();
                }
            }

            DB::commit();
            $reuniao->load(['presencas', 'presencas.cerimoniario']);

            return response()->json([
                'data'    => $reuniao,
                'message' => 'Reunião atualizada com sucesso.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function destroy(Reuniao $reuniao): JsonResponse
    {
        $reuniao->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Reunião removida com sucesso.',
        ]);
    }

    public function updatePresenca(Request $request, Reuniao $reuniao, Cerimoniario $cerimoniario): JsonResponse
    {
        $validated = $request->validate([
            'status'     => 'nullable|in:presente,ausente,justificado',
            'observacao' => 'nullable|string',
        ]);

        $presenca = ReuniaoPresenca::updateOrCreate(
            [
                'reuniao_id'      => $reuniao->id,
                'cerimoniario_id' => $cerimoniario->id,
            ],
            $validated
        );

        return response()->json([
            'data'    => $presenca->load('cerimoniario'),
            'message' => 'Presença registrada.',
        ]);
    }

    public function convite(Reuniao $reuniao): JsonResponse
    {
        return response()->json([
            'data'    => ['texto' => $this->buildConviteTexto($reuniao)],
            'message' => 'Convite gerado.',
        ]);
    }

    private function buildConviteTexto(Reuniao $reuniao): string
    {
        $data    = \Carbon\Carbon::parse($reuniao->data)->locale('pt_BR')->isoFormat('DD/MM/YYYY (dddd)');
        $horario = substr($reuniao->horario, 0, 5);

        $tipoLabel = [
            'ordinaria'      => 'Ordinária',
            'extraordinaria' => 'Extraordinária',
            'formacao'       => 'Formação',
            'planejamento'   => 'Planejamento',
            'outra'          => 'Reunião',
        ][$reuniao->tipo ?? 'ordinaria'] ?? 'Reunião';

        $linhas = ["*REUNIÃO DE CERIMONIÁRIOS — {$tipoLabel}*", ''];
        $linhas[] = "*Data:* {$data}";
        $linhas[] = "*Horário:* {$horario}";
        if ($reuniao->local)      $linhas[] = "*Local:* {$reuniao->local}";
        $linhas[] = '';
        $linhas[] = "*Pauta:* {$reuniao->tema}";
        if ($reuniao->observacao) {
            $linhas[] = '';
            $linhas[] = $reuniao->observacao;
        }
        $linhas[] = '';
        $linhas[] = 'Por favor, confirme sua presença respondendo esta mensagem.';
        $linhas[] = '';
        $linhas[] = 'Que Deus abençoe a todos!';

        return implode("\n", $linhas);
    }
}

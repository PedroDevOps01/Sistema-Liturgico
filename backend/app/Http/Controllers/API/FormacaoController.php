<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\CerimoniarioCompetencia;
use App\Models\Configuracao;
use App\Models\FormacaoCompetencia;
use App\Models\FormacaoNivel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormacaoController extends Controller
{
    public function niveis(): JsonResponse
    {
        $niveis = FormacaoNivel::withCount('competencias')
            ->with(['competencias' => function ($q) {
                $q->orderBy('ordem');
            }])
            ->orderBy('ordem')
            ->get();

        return response()->json([
            'data'    => $niveis,
            'message' => 'Níveis de formação listados com sucesso.',
        ]);
    }

    public function storeNivel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'     => 'required|string|max:100',
            'descricao'=> 'nullable|string',
            'ordem'    => 'nullable|integer',
            'cor'      => 'nullable|string|max:20',
        ]);

        $nivel = FormacaoNivel::create($validated);

        return response()->json([
            'data'    => $nivel,
            'message' => 'Nível de formação criado com sucesso.',
        ], 201);
    }

    public function updateNivel(Request $request, FormacaoNivel $nivel): JsonResponse
    {
        $validated = $request->validate([
            'nome'     => 'sometimes|string|max:100',
            'descricao'=> 'nullable|string',
            'ordem'    => 'nullable|integer',
            'cor'      => 'nullable|string|max:20',
        ]);

        $nivel->update($validated);

        return response()->json([
            'data'    => $nivel->fresh(),
            'message' => 'Nível de formação atualizado com sucesso.',
        ]);
    }

    public function destroyNivel(FormacaoNivel $nivel): JsonResponse
    {
        $nivel->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Nível de formação removido com sucesso.',
        ]);
    }

    public function storeCompetencia(Request $request, FormacaoNivel $nivel): JsonResponse
    {
        $validated = $request->validate([
            'nome'       => 'required|string|max:200',
            'descricao'  => 'nullable|string',
            'obrigatoria'=> 'nullable|boolean',
            'ordem'      => 'nullable|integer',
        ]);

        $validated['formacao_nivel_id'] = $nivel->id;

        $competencia = FormacaoCompetencia::create($validated);

        return response()->json([
            'data'    => $competencia->load('nivel'),
            'message' => 'Competência criada com sucesso.',
        ], 201);
    }

    public function updateCompetencia(Request $request, FormacaoCompetencia $competencia): JsonResponse
    {
        $validated = $request->validate([
            'nome'       => 'sometimes|string|max:200',
            'descricao'  => 'nullable|string',
            'obrigatoria'=> 'nullable|boolean',
            'ordem'      => 'nullable|integer',
        ]);

        $competencia->update($validated);

        return response()->json([
            'data'    => $competencia->fresh(),
            'message' => 'Competência atualizada com sucesso.',
        ]);
    }

    public function destroyCompetencia(FormacaoCompetencia $competencia): JsonResponse
    {
        $competencia->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Competência removida com sucesso.',
        ]);
    }

    public function progressoCerimoniario(Cerimoniario $cerimoniario): JsonResponse
    {
        $niveis = FormacaoNivel::with(['competencias' => function ($q) {
            $q->orderBy('ordem');
        }])->orderBy('ordem')->get();

        // Fetch all competencia records for this cerimoniario in one query
        $progresso = CerimoniarioCompetencia::where('cerimoniario_id', $cerimoniario->id)
            ->get()
            ->keyBy('formacao_competencia_id');

        $totalGeral    = 0;
        $concluidasGeral = 0;

        $niveisData = $niveis->map(function ($nivel) use ($progresso, &$totalGeral, &$concluidasGeral) {
            $total     = 0;
            $concluidas = 0;

            $competenciasData = $nivel->competencias->map(function ($comp) use ($progresso, &$total, &$concluidas) {
                $registro = $progresso->get($comp->id);
                $concluida = $registro ? (bool) $registro->concluida : false;

                $total++;
                if ($concluida) {
                    $concluidas++;
                }

                return array_merge($comp->toArray(), [
                    'concluida'      => $concluida,
                    'data_conclusao' => $registro?->data_conclusao?->format('Y-m-d'),
                    'observacao'     => $registro?->observacao,
                ]);
            });

            $totalGeral      += $total;
            $concluidasGeral += $concluidas;

            $pct = $total > 0 ? round($concluidas / $total * 100, 1) : 0;

            return array_merge($nivel->toArray(), [
                'competencias' => $competenciasData,
                'total'        => $total,
                'concluidas'   => $concluidas,
                'pct'          => $pct,
            ]);
        });

        $pctTotal = $totalGeral > 0 ? round($concluidasGeral / $totalGeral * 100, 1) : 0;

        return response()->json([
            'data' => [
                'cerimoniario' => $cerimoniario,
                'niveis'       => $niveisData,
                'pct_total'    => $pctTotal,
            ],
            'message' => 'Progresso do cerimoniário listado com sucesso.',
        ]);
    }

    public function updateProgresso(Request $request, Cerimoniario $cerimoniario, FormacaoCompetencia $competencia): JsonResponse
    {
        $validated = $request->validate([
            'concluida'      => 'required|boolean',
            'data_conclusao' => 'nullable|date',
            'observacao'     => 'nullable|string',
        ]);

        $validated['concluido_por'] = $validated['concluida'] ? auth()->id() : null;

        $registro = CerimoniarioCompetencia::updateOrCreate(
            [
                'cerimoniario_id'        => $cerimoniario->id,
                'formacao_competencia_id'=> $competencia->id,
            ],
            $validated
        );

        return response()->json([
            'data'    => $registro,
            'message' => 'Progresso atualizado com sucesso.',
        ]);
    }

    public function historico(Cerimoniario $cerimoniario): JsonResponse
    {
        $registros = CerimoniarioCompetencia::where('cerimoniario_id', $cerimoniario->id)
            ->where('concluida', true)
            ->with(['competencia.nivel'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($r) => [
                'competencia_id'    => $r->formacao_competencia_id,
                'competencia_nome'  => $r->competencia?->nome,
                'nivel_nome'        => $r->competencia?->nivel?->nome,
                'data_conclusao'    => $r->data_conclusao?->format('Y-m-d'),
                'concluido_por'     => $r->concluido_por,
                'updated_at'        => $r->updated_at?->format('Y-m-d H:i'),
                'observacao'        => $r->observacao,
            ]);

        return response()->json(['data' => $registros, 'message' => 'Histórico listado.']);
    }

    public function certificado(Cerimoniario $cerimoniario, FormacaoNivel $nivel): \Illuminate\Http\Response
    {
        $competencias = $nivel->competencias()->orderBy('ordem')->get();
        $total = $competencias->count();

        $concluidas = CerimoniarioCompetencia::where('cerimoniario_id', $cerimoniario->id)
            ->whereIn('formacao_competencia_id', $competencias->pluck('id'))
            ->where('concluida', true)
            ->count();

        $pct = $total > 0 ? round($concluidas / $total * 100) : 0;

        $config = Configuracao::first();
        $paroquia = $config?->nome_paroquia ?? 'Ministério dos Acólitos';
        $hoje = \Carbon\Carbon::now()->locale('pt_BR')->isoFormat('D [de] MMMM [de] YYYY');

        $html = view('pdf.certificado', compact('cerimoniario', 'nivel', 'competencias', 'concluidas', 'total', 'pct', 'paroquia', 'hoje'))->render();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download("certificado-{$cerimoniario->numero}-{$nivel->id}.pdf");
    }

    public function overview(): JsonResponse
    {
        $cerimoniarios = Cerimoniario::where('ativo', true)->orderBy('nome')->get();

        $totalCompetenciasObrigatorias = FormacaoCompetencia::where('obrigatoria', true)->count();

        $data = $cerimoniarios->map(function ($cerimoniario) use ($totalCompetenciasObrigatorias) {
            $concluidas = CerimoniarioCompetencia::where('cerimoniario_id', $cerimoniario->id)
                ->where('concluida', true)
                ->whereHas('competencia', function ($q) {
                    $q->where('obrigatoria', true);
                })
                ->count();

            $pct = $totalCompetenciasObrigatorias > 0
                ? round($concluidas / $totalCompetenciasObrigatorias * 100, 1)
                : 0;

            return [
                'id'                           => $cerimoniario->id,
                'nome'                         => $cerimoniario->nome,
                'numero'                       => $cerimoniario->numero,
                'total_obrigatorias'           => $totalCompetenciasObrigatorias,
                'concluidas'                   => $concluidas,
                'pct'                          => $pct,
            ];
        })->sortByDesc('pct')->values();

        return response()->json([
            'data'    => $data,
            'message' => 'Overview de formação listado com sucesso.',
        ]);
    }
}

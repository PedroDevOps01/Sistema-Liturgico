<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Celebracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CerimoniarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Cerimoniario::query();
        if (! $request->boolean('todos')) {
            $query->where('ativo', true);
        }

        if ($request->filled('search')) {
            $query->where('nome', 'ilike', '%' . $request->search . '%');
        }

        $cerimoniarios = $query->orderBy('nome')->get();

        return response()->json([
            'data' => $cerimoniarios,
            'message' => 'Cerimoniários listados com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'numero' => 'nullable|string|max:255',
            'observacao' => 'nullable|string',
            'ativo' => 'boolean',
            'disponivel_domingo_manha' => 'boolean',
            'disponivel_domingo_tarde' => 'boolean',
            'disponivel_domingo_noite' => 'boolean',
            'disponivel_semana_manha' => 'boolean',
            'disponivel_semana_tarde' => 'boolean',
            'disponivel_semana_noite' => 'boolean',
            'disponivel_sabado' => 'boolean',
            'indisponivel_temporario' => 'boolean',
            'experiente' => 'boolean',
            'mestre' => 'boolean',
        ]);

        $cerimoniario = Cerimoniario::create($validated);

        return response()->json([
            'data' => $cerimoniario,
            'message' => 'Cerimoniário criado com sucesso.',
        ], 201);
    }

    public function show(Cerimoniario $cerimoniario): JsonResponse
    {
        return response()->json([
            'data' => $cerimoniario,
            'message' => 'Cerimoniário encontrado.',
        ]);
    }

    public function update(Request $request, Cerimoniario $cerimoniario): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255',
            'numero' => 'nullable|string|max:255',
            'observacao' => 'nullable|string',
            'ativo' => 'sometimes|boolean',
            'disponivel_domingo_manha' => 'sometimes|boolean',
            'disponivel_domingo_tarde' => 'sometimes|boolean',
            'disponivel_domingo_noite' => 'sometimes|boolean',
            'disponivel_semana_manha' => 'sometimes|boolean',
            'disponivel_semana_tarde' => 'sometimes|boolean',
            'disponivel_semana_noite' => 'sometimes|boolean',
            'disponivel_sabado' => 'sometimes|boolean',
            'indisponivel_temporario' => 'sometimes|boolean',
            'experiente' => 'sometimes|boolean',
            'mestre' => 'sometimes|boolean',
        ]);

        $cerimoniario->update($validated);

        return response()->json([
            'data' => $cerimoniario->fresh(),
            'message' => 'Cerimoniário atualizado com sucesso.',
        ]);
    }

    public function destroy(Cerimoniario $cerimoniario): JsonResponse
    {
        DB::table('cerimoniarios')->where('id', $cerimoniario->id)->update(['ativo' => false, 'updated_at' => now()]);

        return response()->json([
            'data' => null,
            'message' => 'Cerimoniário inativado com sucesso.',
        ]);
    }

    public function toggleAtivo(Cerimoniario $cerimoniario): JsonResponse
    {
        $novoAtivo = ! $cerimoniario->ativo;
        DB::table('cerimoniarios')->where('id', $cerimoniario->id)->update(['ativo' => $novoAtivo, 'updated_at' => now()]);

        return response()->json([
            'data' => Cerimoniario::find($cerimoniario->id),
            'message' => $novoAtivo ? 'Cerimoniário ativado.' : 'Cerimoniário desativado.',
        ]);
    }

    public function dashboard(int $id): JsonResponse
    {
        $cerimoniario = Cerimoniario::findOrFail($id);
        $anoAtual = now()->year;
        $hoje = now()->toDateString();

        $totalEscalado = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->count();

        $statusStats = DB::table('presencas as p')
            ->join('escala_itens as ei', 'ei.id', '=', 'p.escala_item_id')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->select('p.status', DB::raw('COUNT(*) as total'))
            ->groupBy('p.status')
            ->get()
            ->keyBy('status');

        $serviu      = (int) ($statusStats->get('serviu')?->total      ?? 0);
        $faltou      = (int) ($statusStats->get('faltou')?->total      ?? 0);
        $substituido = (int) ($statusStats->get('substituido')?->total ?? 0);
        $justificado = (int) ($statusStats->get('justificado')?->total ?? 0);
        $taxaPresenca = ($serviu + $faltou) > 0
            ? round($serviu / ($serviu + $faltou) * 100)
            : null;

        $funcoes = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->leftJoin('funcoes as f', 'f.id', '=', 'ei.funcao_id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->select(
                DB::raw("COALESCE(f.titulo, ei.funcao_label, 'Sem função') as titulo"),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy(DB::raw("COALESCE(f.titulo, ei.funcao_label, 'Sem função')"))
            ->orderByDesc('total')
            ->take(6)
            ->get();

        $historico = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->leftJoin('funcoes as f', 'f.id', '=', 'ei.funcao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->where('cel.data', '<', $hoje)
            ->select(
                'e.id as escala_id',
                'cel.data',
                'cel.horario',
                'cel.periodo_liturgico',
                DB::raw("COALESCE(f.titulo, ei.funcao_label) as funcao"),
                'p.status',
                'p.status_confirmacao'
            )
            ->orderByDesc('cel.data')
            ->take(15)
            ->get();

        $proximas = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->leftJoin('funcoes as f', 'f.id', '=', 'ei.funcao_id')
            ->leftJoin('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->where('cel.data', '>=', $hoje)
            ->select(
                'e.id as escala_id',
                'cel.data',
                'cel.horario',
                'cel.periodo_liturgico',
                DB::raw("COALESCE(f.titulo, ei.funcao_label) as funcao"),
                'p.status_confirmacao'
            )
            ->orderBy('cel.data')
            ->take(6)
            ->get();

        $mensais = DB::table('escala_itens as ei')
            ->join('escalas as e', 'e.id', '=', 'ei.escala_id')
            ->join('celebracoes as cel', 'cel.id', '=', 'e.celebracao_id')
            ->where('ei.cerimoniario_id', $id)
            ->where('e.ativo', true)
            ->where('cel.ativo', true)
            ->whereNull('e.deleted_at')
            ->whereNull('cel.deleted_at')
            ->whereYear('cel.data', $anoAtual)
            ->select(
                DB::raw('EXTRACT(MONTH FROM cel.data)::int as mes'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy(DB::raw('EXTRACT(MONTH FROM cel.data)::int'))
            ->orderBy('mes')
            ->get();

        return response()->json([
            'data' => [
                'cerimoniario' => $cerimoniario,
                'stats' => [
                    'total_escalado' => $totalEscalado,
                    'serviu'         => $serviu,
                    'faltou'         => $faltou,
                    'substituido'    => $substituido,
                    'justificado'    => $justificado,
                    'taxa_presenca'  => $taxaPresenca,
                ],
                'funcoes'   => $funcoes,
                'historico' => $historico,
                'proximas'  => $proximas,
                'mensais'   => $mensais,
                'ano'       => $anoAtual,
            ],
        ]);
    }

    public function disponibilidade(Request $request, int $id): JsonResponse
    {
        $cerimoniario = Cerimoniario::findOrFail($id);

        $request->validate([
            'data' => 'required|date',
            'horario' => 'required|string',
        ]);

        $data = \Carbon\Carbon::parse($request->data);
        $horario = $request->horario;
        $hora = (int) explode(':', $horario)[0];

        $diaSemana = $data->dayOfWeek; // 0=domingo, 6=sábado
        $periodo = $hora < 12 ? 'manha' : ($hora < 17 ? 'tarde' : 'noite');

        $disponivel = true;
        $motivo = null;

        if ($cerimoniario->indisponivel_temporario) {
            $disponivel = false;
            $motivo = 'Cerimoniário marcado como indisponível temporariamente.';
        } elseif (! $cerimoniario->ativo) {
            $disponivel = false;
            $motivo = 'Cerimoniário inativo.';
        } else {
            if ($diaSemana === 0) {
                // Domingo
                $campo = "disponivel_domingo_{$periodo}";
            } elseif ($diaSemana === 6) {
                // Sábado
                $campo = 'disponivel_sabado';
            } else {
                // Semana
                $campo = "disponivel_semana_{$periodo}";
            }

            if (isset($campo) && ! $cerimoniario->$campo) {
                $disponivel = false;
                $motivo = "Cerimoniário não disponível neste período.";
            }
        }

        return response()->json([
            'data' => [
                'cerimoniario' => $cerimoniario,
                'disponivel' => $disponivel,
                'motivo' => $motivo,
            ],
            'message' => $disponivel ? 'Cerimoniário disponível.' : 'Cerimoniário indisponível.',
        ]);
    }
}

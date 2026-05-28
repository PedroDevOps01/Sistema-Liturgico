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
        $query = Cerimoniario::query()->where('ativo', true);

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

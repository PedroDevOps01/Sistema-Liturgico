<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Tunica;
use App\Models\TunicaEmprestimo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TunicaController extends Controller
{
    public function index(): JsonResponse
    {
        $tunicas = Tunica::with(['emprestimoAtual', 'emprestimoAtual.cerimoniario'])
            ->orderBy('codigo')
            ->get();

        return response()->json([
            'data'    => $tunicas,
            'message' => 'Túnicas listadas com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo'     => 'required|string|unique:tunicas,codigo',
            'tamanho'    => 'nullable|in:PP,P,M,G,GG',
            'cor'        => 'required|in:branca,vermelha,preta',
            'estado'     => 'required|in:novo,bom,regular,ruim',
            'observacao' => 'nullable|string',
        ]);

        $tunica = Tunica::create($validated);

        return response()->json([
            'data'    => $tunica->load(['emprestimoAtual', 'emprestimoAtual.cerimoniario']),
            'message' => 'Túnica criada com sucesso.',
        ], 201);
    }

    public function show(Tunica $tunica): JsonResponse
    {
        return response()->json([
            'data'    => $tunica->load(['emprestimoAtual', 'emprestimoAtual.cerimoniario']),
            'message' => 'Túnica encontrada.',
        ]);
    }

    public function update(Request $request, Tunica $tunica): JsonResponse
    {
        $validated = $request->validate([
            'codigo'     => 'sometimes|string|unique:tunicas,codigo,' . $tunica->id,
            'tamanho'    => 'nullable|in:PP,P,M,G,GG',
            'cor'        => 'sometimes|in:branca,vermelha,preta',
            'estado'     => 'sometimes|in:novo,bom,regular,ruim',
            'observacao' => 'nullable|string',
        ]);

        $tunica->update($validated);

        return response()->json([
            'data'    => $tunica->fresh(),
            'message' => 'Túnica atualizada com sucesso.',
        ]);
    }

    public function destroy(Tunica $tunica): JsonResponse
    {
        $tunica->delete();

        return response()->json([
            'data'    => null,
            'message' => 'Túnica removida com sucesso.',
        ]);
    }

    public function emprestar(Request $request, Tunica $tunica): JsonResponse
    {
        $request->validate([
            'cerimoniario_id'         => 'required|exists:cerimoniarios,id',
            'data_devolucao_prevista' => 'nullable|date',
            'observacao'              => 'nullable|string',
        ]);

        $emprestimoAtivo = TunicaEmprestimo::where('tunica_id', $tunica->id)
            ->where('status', 'emprestada')
            ->exists();

        if ($emprestimoAtivo) {
            return response()->json([
                'data'    => null,
                'message' => 'Túnica já está emprestada.',
            ], 422);
        }

        $emprestimo = TunicaEmprestimo::create([
            'tunica_id'               => $tunica->id,
            'cerimoniario_id'         => $request->cerimoniario_id,
            'data_emprestimo'         => now()->toDateString(),
            'data_devolucao_prevista' => $request->data_devolucao_prevista,
            'observacao'              => $request->observacao,
            'status'                  => 'emprestada',
        ]);

        return response()->json([
            'data'    => $emprestimo->load('cerimoniario'),
            'message' => 'Túnica emprestada com sucesso.',
        ], 201);
    }

    public function devolver(Request $request, Tunica $tunica): JsonResponse
    {
        $request->validate([
            'observacao' => 'nullable|string',
        ]);

        $emprestimo = TunicaEmprestimo::where('tunica_id', $tunica->id)
            ->where('status', 'emprestada')
            ->firstOrFail();

        $emprestimo->update([
            'data_devolucao_real' => now()->toDateString(),
            'status'              => 'devolvida',
            'observacao'          => $request->observacao ?? $emprestimo->observacao,
        ]);

        return response()->json([
            'data'    => $emprestimo->fresh()->load('cerimoniario'),
            'message' => 'Túnica devolvida com sucesso.',
        ]);
    }

    public function marcarPerdida(Request $request, Tunica $tunica): JsonResponse
    {
        $request->validate(['observacao' => 'nullable|string']);

        $emprestimo = TunicaEmprestimo::where('tunica_id', $tunica->id)
            ->where('status', 'emprestada')
            ->firstOrFail();

        $emprestimo->update([
            'status'     => 'perdida',
            'observacao' => $request->observacao ?? $emprestimo->observacao,
        ]);

        return response()->json([
            'data'    => $emprestimo->fresh()->load('cerimoniario'),
            'message' => 'Túnica marcada como perdida.',
        ]);
    }

    public function marcarEncontrada(Request $request, Tunica $tunica): JsonResponse
    {
        $request->validate(['observacao' => 'nullable|string']);

        $emprestimo = TunicaEmprestimo::where('tunica_id', $tunica->id)
            ->where('status', 'perdida')
            ->firstOrFail();

        $emprestimo->update([
            'status'              => 'devolvida',
            'data_devolucao_real' => now()->toDateString(),
            'observacao'          => $request->observacao ?? $emprestimo->observacao,
        ]);

        return response()->json([
            'data'    => $emprestimo->fresh()->load('cerimoniario'),
            'message' => 'Túnica marcada como encontrada e disponível.',
        ]);
    }

    public function historico(Tunica $tunica): JsonResponse
    {
        $historico = TunicaEmprestimo::where('tunica_id', $tunica->id)
            ->with('cerimoniario')
            ->orderByDesc('data_emprestimo')
            ->get();

        return response()->json([
            'data'    => $historico,
            'message' => 'Histórico de empréstimos listado com sucesso.',
        ]);
    }

    public function disponiveis(): JsonResponse
    {
        $tunicas = Tunica::whereDoesntHave('emprestimos', function ($query) {
            $query->whereIn('status', ['emprestada', 'perdida']);
        })
            ->orderBy('codigo')
            ->get();

        return response()->json([
            'data'    => $tunicas,
            'message' => 'Túnicas disponíveis listadas com sucesso.',
        ]);
    }
}

<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use App\Models\Cerimoniario;
use App\Models\Escala;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuscaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['data' => ['cerimoniarios' => [], 'celebracoes' => [], 'escalas' => []]]);
        }

        $pattern = "%{$q}%";

        $cerimoniarios = Cerimoniario::where('ativo', true)
            ->where('nome', 'ilike', $pattern)
            ->take(5)
            ->get(['id', 'nome', 'experiente', 'mestre'])
            ->map(fn ($c) => [
                'tipo'      => 'cerimoniario',
                'id'        => $c->id,
                'titulo'    => $c->nome,
                'subtitulo' => $c->mestre ? 'Mestre' : ($c->experiente ? 'Experiente' : 'Acólito'),
                'url'       => "/cerimoniarios/{$c->id}",
            ]);

        $celebracoes = Celebracao::where('ativo', true)
            ->where(fn ($q) =>
                $q->where('periodo_liturgico', 'ilike', $pattern)
                  ->orWhereRaw("to_char(data, 'DD/MM/YYYY') ilike ?", [$pattern])
                  ->orWhereRaw("to_char(data, 'DD/MM') ilike ?", [$pattern])
            )
            ->orderBy('data', 'desc')
            ->take(5)
            ->get(['id', 'data', 'horario', 'periodo_liturgico'])
            ->map(fn ($c) => [
                'tipo'      => 'celebracao',
                'id'        => $c->id,
                'titulo'    => $c->periodo_liturgico,
                'subtitulo' => \Carbon\Carbon::parse($c->data)->format('d/m/Y') . ' às ' . substr($c->horario, 0, 5),
                'url'       => '/celebracoes',
            ]);

        $escalas = Escala::with('celebracao')
            ->where('ativo', true)
            ->whereHas('celebracao', fn ($q) =>
                $q->where('periodo_liturgico', 'ilike', $pattern)
                  ->orWhereRaw("to_char(celebracoes.data, 'DD/MM/YYYY') ilike ?", [$pattern])
                  ->orWhereRaw("to_char(celebracoes.data, 'DD/MM') ilike ?", [$pattern])
            )
            ->take(5)
            ->get()
            ->map(fn ($e) => [
                'tipo'      => 'escala',
                'id'        => $e->id,
                'titulo'    => "Escala — {$e->celebracao->periodo_liturgico}",
                'subtitulo' => \Carbon\Carbon::parse($e->celebracao->data)->format('d/m/Y') . ' às ' . substr($e->celebracao->horario, 0, 5),
                'url'       => "/escalas/{$e->id}",
            ]);

        return response()->json([
            'data' => [
                'cerimoniarios' => $cerimoniarios,
                'celebracoes'   => $celebracoes,
                'escalas'       => $escalas,
            ],
        ]);
    }
}

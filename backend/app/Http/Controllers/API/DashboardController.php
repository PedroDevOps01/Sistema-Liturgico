<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use App\Models\Cerimoniario;
use App\Models\Escala;
use App\Models\EscalaItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $hoje = now()->toDateString();
        $inicioMes = now()->startOfMonth()->toDateString();
        $fimMes = now()->endOfMonth()->toDateString();

        // Próximas celebrações (próximos 30 dias)
        $proximasCelebracoes = Celebracao::with('escala')
            ->where('data', '>=', $hoje)
            ->where('data', '<=', now()->addDays(30)->toDateString())
            ->orderBy('data')
            ->orderBy('horario')
            ->take(10)
            ->get();

        // Escalas do mês
        $escalasDoMes = Escala::whereHas('celebracao', function ($q) use ($inicioMes, $fimMes) {
            $q->whereBetween('data', [$inicioMes, $fimMes]);
        })->count();

        // Cerimoniários ativos
        $cerimoniarios_ativos = Cerimoniario::where('ativo', true)->count();

        // Celebrações sem escala (próximos 30 dias)
        $celebracoesSemEscala = Celebracao::whereDoesntHave('escala')
            ->where('data', '>=', $hoje)
            ->where('data', '<=', now()->addDays(30)->toDateString())
            ->count();

        // Alertas de conflito: cerimoniários escalados em 2+ celebrações no mesmo horário
        $alertasConflito = DB::table(DB::raw('(
            SELECT ei.cerimoniario_id, c.data, c.horario, COUNT(*) as cnt
            FROM escala_itens ei
            JOIN escalas e ON e.id = ei.escala_id
            JOIN celebracoes c ON c.id = e.celebracao_id
            WHERE ei.cerimoniario_id IS NOT NULL AND c.data >= \'' . $hoje . '\'
            GROUP BY ei.cerimoniario_id, c.data, c.horario
            HAVING COUNT(*) > 1
        ) as conflitos'))->count();

        return response()->json([
            'data' => [
                'proximasCelebracoes' => $proximasCelebracoes,
                'escalasDoMes' => $escalasDoMes,
                'cerimoniarios_ativos' => $cerimoniarios_ativos,
                'celebracoesSemEscala' => $celebracoesSemEscala,
                'alertasConflito' => $alertasConflito,
            ],
            'message' => 'Dashboard carregado com sucesso.',
        ]);
    }
}

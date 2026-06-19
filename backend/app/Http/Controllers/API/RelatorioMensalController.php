<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Celebracao;
use App\Models\RelatorioMensalStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class RelatorioMensalController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user     = $request->user();
        $mesAtual = Carbon::now()->format('Y-m');
        $mesRelatorio = Carbon::now()->subMonth()->format('Y-m');

        // Só mostrar a partir do dia 1, e apenas se o mês anterior tiver dados
        $temDados = Celebracao::whereRaw("TO_CHAR(data, 'YYYY-MM') = ?", [$mesRelatorio])->exists();

        if (!$temDados) {
            return response()->json(['deve_mostrar' => false]);
        }

        $jaViu = RelatorioMensalStatus::where('user_id', $user->id)
            ->where('mes', $mesAtual)
            ->exists();

        return response()->json([
            'deve_mostrar'  => !$jaViu,
            'mes_relatorio' => $mesRelatorio,
            'label_mes'     => Carbon::now()->subMonth()->locale('pt_BR')->isoFormat('MMMM [de] YYYY'),
        ]);
    }

    public function marcarRecebido(Request $request): JsonResponse
    {
        $request->validate(['status' => 'required|in:downloaded,dismissed']);

        RelatorioMensalStatus::updateOrCreate(
            ['user_id' => $request->user()->id, 'mes' => Carbon::now()->format('Y-m')],
            ['status'  => $request->status]
        );

        return response()->json(['ok' => true]);
    }

    public function download(Request $request, int $year, int $month): Response
    {
        $inicio = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $fim    = $inicio->copy()->endOfMonth();
        $label  = $inicio->locale('pt_BR')->isoFormat('MMMM [de] YYYY');

        // Celebrações do mês
        $celebracoes = Celebracao::whereNull('deleted_at')
            ->whereBetween('data', [$inicio->toDateString(), $fim->toDateString()])
            ->orderBy('data')->orderBy('horario')
            ->get(['data', 'horario', 'periodo_liturgico']);

        // Presenças do mês
        $statusResumo = DB::table('presencas as p')
            ->join('escala_itens as ei', 'p.escala_item_id', '=', 'ei.id')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('celebracoes as c', 'e.celebracao_id', '=', 'c.id')
            ->whereBetween('c.data', [$inicio->toDateString(), $fim->toDateString()])
            ->whereNotNull('p.status')
            ->selectRaw("p.status, COUNT(*) as total")
            ->groupBy('p.status')->get()->keyBy('status');

        $serviu  = $statusResumo->get('serviu')?->total  ?? 0;
        $faltou  = $statusResumo->get('faltou')?->total  ?? 0;
        $subst   = $statusResumo->get('substituido')?->total ?? 0;
        $justif  = $statusResumo->get('justificado')?->total ?? 0;
        $totalP  = $serviu + $faltou + $subst + $justif;
        $presMedia = $totalP > 0 ? round(($serviu / $totalP) * 100) : 0;

        // Ranking do mês
        $ranking = DB::table('cerimoniarios as c')
            ->join('escala_itens as ei', 'ei.cerimoniario_id', '=', 'c.id')
            ->join('escalas as e', 'ei.escala_id', '=', 'e.id')
            ->join('celebracoes as cel', 'e.celebracao_id', '=', 'cel.id')
            ->join('presencas as p', 'p.escala_item_id', '=', 'ei.id')
            ->whereBetween('cel.data', [$inicio->toDateString(), $fim->toDateString()])
            ->whereNotNull('p.status')
            ->select('c.nome')
            ->selectRaw("SUM(CASE WHEN p.status = 'serviu' THEN 1 ELSE 0 END) as presente")
            ->selectRaw("SUM(CASE WHEN p.status = 'faltou' THEN 1 ELSE 0 END) as ausente")
            ->selectRaw("COUNT(p.id) as total")
            ->groupBy('c.id', 'c.nome')
            ->havingRaw('COUNT(p.id) > 0')
            ->orderByDesc('presente')
            ->limit(15)
            ->get();

        // Novos acólitos no mês
        $novosAcolitos = Cerimoniario::whereBetween('created_at', [$inicio, $fim])
            ->whereNull('deleted_at')->count();

        $pdf = Pdf::loadView('pdf.relatorio-mensal', [
            'label'        => $label,
            'ano'          => $year,
            'mes'          => $month,
            'celebracoes'  => $celebracoes,
            'total_cel'    => $celebracoes->count(),
            'serviu'       => $serviu,
            'faltou'       => $faltou,
            'substituido'  => $subst,
            'justificado'  => $justif,
            'total_presencas' => $totalP,
            'pres_media'   => $presMedia,
            'ranking'      => $ranking,
            'novos_acolitos' => $novosAcolitos,
            'gerado_em'    => Carbon::now()->locale('pt_BR')->isoFormat('D [de] MMMM [de] YYYY, HH:mm'),
        ])->setPaper('a4', 'portrait');

        $filename = "relatorio-{$year}-{$month}.pdf";

        return $pdf->download($filename);
    }
}

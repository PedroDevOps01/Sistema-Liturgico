<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Celebracao;
use App\Models\Cerimoniario;
use App\Models\Presenca;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PortalStatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $hoje = now()->toDateString();

        // Total de acólitos ativos
        $totalAcolitos = Cerimoniario::where('ativo', true)->count();

        // Total de celebrações cadastradas (ativas)
        $totalCelebracoes = Celebracao::where('ativo', true)->count();

        // Celebrações desta semana (até domingo seguinte)
        $inicioSemana = now()->startOfWeek()->toDateString();
        $fimSemana    = now()->endOfWeek()->toDateString();
        $celebracoesNaSemana = Celebracao::where('ativo', true)
            ->whereBetween('data', [$inicioSemana, $fimSemana])
            ->count();

        // Presença média geral (status = 'serviu' / total com status)
        $statusResumo = DB::table('presencas')
            ->whereNotNull('status')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $serviu    = $statusResumo->get('serviu')?->total ?? 0;
        $faltou    = $statusResumo->get('faltou')?->total ?? 0;
        $total     = $serviu + $faltou
            + ($statusResumo->get('substituido')?->total ?? 0)
            + ($statusResumo->get('justificado')?->total ?? 0);

        $presencaMedia = $total > 0 ? (int) round(($serviu / $total) * 100) : 0;

        // Próximas celebrações (3 para o hero, 14 para a agenda pública)
        $proximasCelebracoes = Celebracao::where('ativo', true)
            ->where('data', '>=', $hoje)
            ->orderBy('data')
            ->orderBy('horario')
            ->take(14)
            ->get(['data', 'horario', 'periodo_liturgico', 'celebracao_noite',
                   'santa_missa', 'celebracao_palavra', 'celebracao_solene',
                   'casamento', 'batismo', 'crisma', 'adoracao_santissimo',
                   'corpus_christi', 'vigilia_pascal', 'exequias']);

        // Monta um rótulo legível para cada celebração
        $proximasCelebracoes = $proximasCelebracoes->map(function ($c) {
            // (closure usada também para agenda)
            $tipo = 'Santa Missa';
            if ($c->celebracao_palavra)  $tipo = 'Cel. da Palavra';
            elseif ($c->celebracao_solene) $tipo = 'Missa Solene';
            elseif ($c->casamento)        $tipo = 'Casamento';
            elseif ($c->batismo)          $tipo = 'Batismo';
            elseif ($c->crisma)           $tipo = 'Crisma';
            elseif ($c->adoracao_santissimo) $tipo = 'Adoração Santíssimo';
            elseif ($c->corpus_christi)   $tipo = 'Corpus Christi';
            elseif ($c->vigilia_pascal)   $tipo = 'Vigília Pascal';
            elseif ($c->exequias)         $tipo = 'Exéquias';

            $horario = substr($c->horario, 0, 5);

            return [
                'data'             => $c->data->format('Y-m-d'),
                'horario'          => $horario,
                'periodo_liturgico'=> $c->periodo_liturgico,
                'celebracao_noite' => $c->celebracao_noite,
                'tipo'             => $tipo,
            ];
        });

        // Anos de serviço: baseado na celebração mais antiga registrada
        $primeiraData = Celebracao::withTrashed()->min('data');
        $anosServico  = $primeiraData
            ? max(1, now()->year - \Carbon\Carbon::parse($primeiraData)->year)
            : 0;

        return response()->json([
            'total_acolitos'       => $totalAcolitos,
            'total_celebracoes'    => $totalCelebracoes,
            'celebracoes_semana'   => $celebracoesNaSemana,
            'presenca_media'       => $presencaMedia,
            'anos_servico'         => $anosServico,
            'proximas_celebracoes' => $proximasCelebracoes->take(3)->values(),
            'agenda'               => $proximasCelebracoes->values(),
        ]);
    }
}

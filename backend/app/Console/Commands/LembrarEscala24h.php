<?php

namespace App\Console\Commands;

use App\Models\Celebracao;
use App\Services\NotificacaoService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class LembrarEscala24h extends Command
{
    protected $signature = 'app:lembrar-escala-24h';

    protected $description = 'Envia lembrete de escala ~24h antes do horário da celebração';

    public function handle(NotificacaoService $notificacao): int
    {
        $agora = now();

        $celebracoes = Celebracao::where('ativo', true)
            ->whereBetween('data', [$agora->toDateString(), $agora->copy()->addDays(2)->toDateString()])
            ->whereHas('escala', fn ($q) => $q->where('ativo', true))
            ->with(['escala.escalaItens.cerimoniario'])
            ->get();

        $enviados = 0;

        foreach ($celebracoes as $celebracao) {
            $momento = Carbon::parse($celebracao->data->toDateString() . ' ' . $celebracao->horario);
            $horasRestantes = $agora->diffInHours($momento, false);

            if ($horasRestantes < 23 || $horasRestantes > 25) {
                continue;
            }

            $escala = $celebracao->escala;
            if (! $escala) {
                continue;
            }

            $data    = $momento->locale('pt_BR')->isoFormat('DD/MM/YYYY (dddd)');
            $horario = substr($celebracao->horario, 0, 5);
            $texto   = "*Lembrete: sua celebração é amanhã!*\n\n{$celebracao->periodo_liturgico}\n📅 {$data}\n⏰ {$horario}";

            foreach ($escala->escalaItens as $item) {
                if ($item->cerimoniario && $notificacao->enviarParaCerimoniario($item->cerimoniario, $texto, 'escala_lembrete_24h', $escala)) {
                    $enviados++;
                }
            }
        }

        $this->info("Lembretes de 24h enviados: {$enviados}.");

        return self::SUCCESS;
    }
}

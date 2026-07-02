<?php

namespace App\Console\Commands;

use App\Models\Reuniao;
use App\Models\Treinamento;
use App\Services\NotificacaoService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class LembrarReuniaoOuTreinamento extends Command
{
    protected $signature = 'app:lembrar-reuniao-treinamento';

    protected $description = 'Envia lembrete ~24h antes de reuniões e treinamentos, apenas para os convidados';

    public function handle(NotificacaoService $notificacao): int
    {
        $enviados = $this->lembrarReunioes($notificacao) + $this->lembrarTreinamentos($notificacao);

        $this->info("Lembretes de reunião/treinamento enviados: {$enviados}.");

        return self::SUCCESS;
    }

    private function estaNaJanela(Carbon $agora, $data, string $horario): bool
    {
        $momento = Carbon::parse($data->toDateString() . ' ' . $horario);
        $horasRestantes = $agora->diffInHours($momento, false);

        return $horasRestantes >= 23 && $horasRestantes <= 25;
    }

    private function lembrarReunioes(NotificacaoService $notificacao): int
    {
        $agora = now();
        $enviados = 0;

        $reunioes = Reuniao::whereBetween('data', [$agora->toDateString(), $agora->copy()->addDays(2)->toDateString()])
            ->with('presencas.cerimoniario')
            ->get();

        foreach ($reunioes as $reuniao) {
            if (! $this->estaNaJanela($agora, $reuniao->data, $reuniao->horario)) {
                continue;
            }

            $horario = substr($reuniao->horario, 0, 5);
            $texto   = "*Lembrete: reunião amanhã!*\n\n{$reuniao->tema}\n⏰ {$horario}" . ($reuniao->local ? "\n📍 {$reuniao->local}" : '');

            foreach ($reuniao->presencas as $presenca) {
                if ($presenca->cerimoniario && $notificacao->enviarParaCerimoniario($presenca->cerimoniario, $texto, 'reuniao_lembrete', $reuniao)) {
                    $enviados++;
                }
            }
        }

        return $enviados;
    }

    private function lembrarTreinamentos(NotificacaoService $notificacao): int
    {
        $agora = now();
        $enviados = 0;

        $treinamentos = Treinamento::whereBetween('data', [$agora->toDateString(), $agora->copy()->addDays(2)->toDateString()])
            ->with('presencas.cerimoniario')
            ->get();

        foreach ($treinamentos as $treinamento) {
            if (! $this->estaNaJanela($agora, $treinamento->data, $treinamento->horario)) {
                continue;
            }

            $horario = substr($treinamento->horario, 0, 5);
            $texto   = "*Lembrete: treinamento amanhã!*\n\n{$treinamento->tema}\n⏰ {$horario}" . ($treinamento->local ? "\n📍 {$treinamento->local}" : '');

            foreach ($treinamento->presencas as $presenca) {
                if ($presenca->cerimoniario && $notificacao->enviarParaCerimoniario($presenca->cerimoniario, $texto, 'treinamento_lembrete', $treinamento)) {
                    $enviados++;
                }
            }
        }

        return $enviados;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Escala;
use App\Services\JanelaPresencaService;
use Illuminate\Console\Command;

class FecharJanelasPresencaAutomatico extends Command
{
    protected $signature = 'app:fechar-janelas-presenca';

    protected $description = 'Encerra automaticamente a janela de presença ao chegar o horário de início da celebração, marcando falta de quem não confirmou';

    public function handle(JanelaPresencaService $janela): int
    {
        $fechadas = 0;

        Escala::where('presenca_aberta', true)
            ->whereHas('celebracao', fn ($q) => $q->whereDate('data', now()->toDateString()))
            ->with('celebracao')
            ->get()
            ->each(function (Escala $escala) use ($janela, &$fechadas) {
                if ($janela->deveEncerrar($escala)) {
                    $janela->encerrar($escala);
                    $fechadas++;
                }
            });

        $this->info("Janelas fechadas automaticamente: {$fechadas}.");

        return self::SUCCESS;
    }
}

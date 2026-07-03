<?php

namespace App\Console\Commands;

use App\Models\Escala;
use App\Services\JanelaPresencaService;
use Illuminate\Console\Command;

class AbrirJanelasPresencaAutomatico extends Command
{
    protected $signature = 'app:abrir-janelas-presenca';

    protected $description = 'Abre automaticamente a janela de presença 30min antes da celebração, caso o mestre ainda não tenha aberto';

    public function handle(JanelaPresencaService $janela): int
    {
        $abertas = 0;

        Escala::where('ativo', true)
            ->where('presenca_aberta', false)
            ->whereNull('presenca_fechada_em')
            ->whereHas('celebracao', fn ($q) => $q->where('ativo', true)->whereDate('data', now()->toDateString()))
            ->with('celebracao')
            ->get()
            ->each(function (Escala $escala) use ($janela, &$abertas) {
                if ($janela->deveAbrirAutomaticamente($escala)) {
                    $janela->abrir($escala);
                    $abertas++;
                }
            });

        $this->info("Janelas abertas automaticamente: {$abertas}.");

        return self::SUCCESS;
    }
}

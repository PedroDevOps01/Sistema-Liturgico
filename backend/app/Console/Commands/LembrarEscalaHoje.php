<?php

namespace App\Console\Commands;

use App\Models\Celebracao;
use App\Services\NotificacaoService;
use Illuminate\Console\Command;

class LembrarEscalaHoje extends Command
{
    protected $signature = 'app:lembrar-escala-dia';

    protected $description = 'Envia lembrete de escala no dia da celebração';

    public function handle(NotificacaoService $notificacao): int
    {
        $hoje = now()->toDateString();

        $celebracoes = Celebracao::where('ativo', true)
            ->where('data', $hoje)
            ->whereHas('escala', fn ($q) => $q->where('ativo', true))
            ->with(['escala.escalaItens.cerimoniario'])
            ->get();

        $enviados = 0;

        foreach ($celebracoes as $celebracao) {
            $escala = $celebracao->escala;
            if (! $escala) {
                continue;
            }

            $horario = substr($celebracao->horario, 0, 5);
            $texto   = "*Lembrete: sua celebração é hoje!*\n\n{$celebracao->periodo_liturgico}\n⏰ {$horario}";

            foreach ($escala->escalaItens as $item) {
                if ($item->cerimoniario && $notificacao->enviarParaCerimoniario($item->cerimoniario, $texto, 'escala_lembrete_dia', $escala)) {
                    $enviados++;
                }
            }
        }

        $this->info("Lembretes do dia enviados: {$enviados}.");

        return self::SUCCESS;
    }
}

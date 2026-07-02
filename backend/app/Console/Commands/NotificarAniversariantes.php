<?php

namespace App\Console\Commands;

use App\Models\Cerimoniario;
use App\Models\Configuracao;
use App\Models\NotificacaoEnviada;
use App\Services\NotificacaoService;
use Illuminate\Console\Command;

class NotificarAniversariantes extends Command
{
    protected $signature = 'app:notificar-aniversariantes';

    protected $description = 'Envia mensagem de parabéns aos cerimoniários que fazem aniversário hoje';

    public function handle(NotificacaoService $notificacao): int
    {
        $hoje = now();
        $template = Configuracao::first()?->aniversario_mensagem_texto
            ?? 'Feliz aniversário, {nome}! Que Deus abençoe sua vida. 🎉';

        $aniversariantes = Cerimoniario::where('ativo', true)
            ->whereNotNull('data_nascimento')
            ->whereMonth('data_nascimento', $hoje->month)
            ->whereDay('data_nascimento', $hoje->day)
            ->get();

        $enviados = 0;

        foreach ($aniversariantes as $c) {
            // Recorrência anual: dedup manual por dia (o dedup padrão do NotificacaoService é por
            // referência de model, que não se aplica a um evento que se repete todo ano na mesma pessoa).
            $jaEnviadoHoje = NotificacaoEnviada::where('categoria', 'aniversario')
                ->where('cerimoniario_id', $c->id)
                ->where('status', 'enviado')
                ->whereDate('created_at', $hoje->toDateString())
                ->exists();

            if ($jaEnviadoHoje) {
                continue;
            }

            $primeiroNome = explode(' ', trim($c->nome))[0];
            $mensagem = str_replace('{nome}', $primeiroNome, $template);

            if ($notificacao->enviarParaCerimoniario($c, $mensagem, 'aniversario')) {
                $enviados++;
            }
        }

        $this->info("Aniversariantes notificados: {$enviados} de {$aniversariantes->count()}.");

        return self::SUCCESS;
    }
}

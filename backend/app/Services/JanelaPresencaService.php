<?php

namespace App\Services;

use App\Models\Escala;
use App\Models\Presenca;
use Carbon\Carbon;

/**
 * Regra única da janela de presença: abre em início-30min (se ainda não aberta manualmente)
 * e fecha sempre em início, independente de quando foi aberta (manual ou automática).
 */
class JanelaPresencaService
{
    public function __construct(private NotificacaoService $notificacao)
    {
    }

    public function inicioCelebracao(Escala $escala): ?Carbon
    {
        $escala->loadMissing('celebracao');
        if (! $escala->celebracao) {
            return null;
        }

        return Carbon::createFromFormat(
            'Y-m-d H:i:s',
            substr($escala->celebracao->data, 0, 10) . ' ' . $escala->celebracao->horario,
            'America/Sao_Paulo'
        );
    }

    public function podeAbrirManualmente(Escala $escala): bool
    {
        $inicio = $this->inicioCelebracao($escala);
        if (! $inicio) {
            return true;
        }

        return now()->gte($inicio->copy()->subHour()) && now()->lt($inicio);
    }

    public function deveAbrirAutomaticamente(Escala $escala): bool
    {
        if ($escala->presenca_aberta || $escala->presenca_fechada_em) {
            return false;
        }

        $inicio = $this->inicioCelebracao($escala);
        if (! $inicio) {
            return false;
        }

        return now()->gte($inicio->copy()->subMinutes(30)) && now()->lt($inicio);
    }

    public function deveEncerrar(Escala $escala): bool
    {
        if (! $escala->presenca_aberta) {
            return false;
        }

        $inicio = $this->inicioCelebracao($escala);

        return $inicio && now()->gte($inicio);
    }

    /**
     * Código exibido pelo mestre para os demais escalados escanearem antes de marcar
     * que serviram. Derivado de escala_id + presenca_aberta_em, então roda sozinho a
     * cada nova abertura da janela — não precisa de coluna própria nem de expiração manual.
     */
    public function qrcodeToken(Escala $escala): ?string
    {
        if (! $escala->presenca_aberta || ! $escala->presenca_aberta_em) {
            return null;
        }

        $assinatura = substr(
            hash_hmac('sha256', $escala->id . '|' . $escala->presenca_aberta_em->toISOString(), config('app.key')),
            0,
            16
        );

        return "ESCALA-{$escala->id}-{$assinatura}";
    }

    public function qrcodeValido(Escala $escala, ?string $qrcode): bool
    {
        $esperado = $this->qrcodeToken($escala);

        return $qrcode && $esperado && hash_equals($esperado, $qrcode);
    }

    public function abrir(Escala $escala): void
    {
        if ($escala->presenca_aberta) {
            return;
        }

        $escala->update([
            'presenca_aberta'     => true,
            'presenca_aberta_em'  => now(),
            'presenca_fechada_em' => null,
        ]);

        $this->notificarAbertura($escala);
    }

    public function encerrar(Escala $escala): void
    {
        if (! $escala->presenca_aberta) {
            return;
        }

        $escala->load('itens.presenca', 'itens.cerimoniario', 'itens.funcao');

        $confirmaram = 0;
        $faltaram    = 0;
        foreach ($escala->itens as $item) {
            if (! $item->cerimoniario_id) {
                continue;
            }
            if ($item->presenca?->status === 'serviu') {
                $confirmaram++;
                continue;
            }
            if (! $item->presenca || ! $item->presenca->status) {
                Presenca::updateOrCreate(['escala_item_id' => $item->id], ['status' => 'faltou']);
                $faltaram++;
            }
        }

        $escala->update([
            'presenca_aberta'     => false,
            'presenca_fechada_em' => now(),
        ]);

        // Ninguém confirmou presença: sinal de que a janela pode não ter sido comunicada ao grupo,
        // então alertamos o mestre. Se ao menos uma pessoa confirmou, a notificação claramente
        // chegou e funcionou — quem faltou fez isso por conta própria, não é responsabilidade dele.
        if ($confirmaram === 0) {
            $this->alertarMestreFaltaGeral($escala, $faltaram);
        }
    }

    private function notificarAbertura(Escala $escala): void
    {
        $escala->load('itens.cerimoniario', 'celebracao');
        $horario = substr($escala->celebracao->horario ?? '', 0, 5);
        $texto = "*Janela de presença aberta!*\n\nMarque sua presença até o início da celebração ({$horario}) pelo Portal do Membro.";

        foreach ($escala->itens as $item) {
            if ($item->cerimoniario) {
                $this->notificacao->enviarParaCerimoniario($item->cerimoniario, $texto, 'presenca_janela_aberta', $escala);
            }
        }
    }

    private function alertarMestreFaltaGeral(Escala $escala, int $faltaram): void
    {
        $mestreItem = $escala->itens->first(
            fn ($i) => str_contains(strtolower($i->funcao_label ?? $i->funcao?->titulo ?? ''), 'mestre')
        );

        if (! $mestreItem || ! $mestreItem->cerimoniario) {
            return;
        }

        $texto = "*Atenção:* a janela de presença fechou e nenhuma pessoa da escala confirmou presença "
            . "({$faltaram} marcada(s) como falta). Isso pode indicar que o grupo não ficou sabendo que a janela estava aberta — "
            . "avise a equipe diretamente na próxima escala. Ela abre sozinha 30min antes, mas você pode abrir "
            . "manualmente até 1h antes para dar mais tempo ao grupo.";

        $this->notificacao->enviarParaCerimoniario($mestreItem->cerimoniario, $texto, 'presenca_falta_geral', $escala);
    }
}

<?php

namespace App\Services;

use App\Models\Cerimoniario;
use App\Models\Comunicado;
use App\Models\Configuracao;
use App\Models\NotificacaoEnviada;
use App\Services\Whatsapp\WhatsappChannel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Ponto único de disparo de notificação do sistema. Qualquer gatilho (escala criada, convite de
 * reunião, lembrete agendado, comunicado geral) passa por aqui — garante que todo envio também
 * fica registrado em `notificacoes_enviadas` (auditoria) e em `comunicados` (aba do Portal do Membro).
 */
class NotificacaoService
{
    public function __construct(private WhatsappChannel $whatsapp)
    {
    }

    /**
     * Envia uma notificação via WhatsApp para um cerimoniário, com deduplicação por referência.
     * Nunca lança exceção — falha de envio não deve derrubar o fluxo que a disparou.
     */
    public function enviarParaCerimoniario(
        Cerimoniario $cerimoniario,
        string $mensagem,
        string $categoria,
        ?Model $referencia = null,
        ?string $tituloComunicado = null,
        string $tipoComunicado = 'info',
        ?string $corpoComunicado = null
    ): bool {
        if ($referencia && $this->jaEnviado($categoria, $referencia, $cerimoniario->id)) {
            return false;
        }

        $enviado = false;
        $erro = null;

        try {
            $enviado = $this->whatsapp->enviar($cerimoniario->numero ?? '', $mensagem);
        } catch (\Throwable $e) {
            $erro = $e->getMessage();
            Log::error('NotificacaoService: falha ao enviar WhatsApp.', ['cerimoniario_id' => $cerimoniario->id, 'erro' => $erro]);
        }

        NotificacaoEnviada::create([
            'cerimoniario_id' => $cerimoniario->id,
            'canal'           => 'whatsapp',
            'categoria'       => $categoria,
            'referencia_type' => $referencia ? get_class($referencia) : null,
            'referencia_id'   => $referencia?->id,
            'destinatario'    => $cerimoniario->numero,
            'mensagem'        => $mensagem,
            'status'          => $enviado ? 'enviado' : 'falhou',
            'erro'            => $erro,
        ]);

        Comunicado::create([
            'cerimoniario_id' => $cerimoniario->id,
            'titulo'          => $tituloComunicado ?? $this->tituloPorCategoria($categoria),
            'corpo'           => $corpoComunicado ?? $mensagem,
            'tipo'            => $tipoComunicado,
            'categoria'       => $categoria,
            'canal'           => 'whatsapp',
            'ativo'           => true,
        ]);

        return $enviado;
    }

    /** Alerta interno por e-mail para os administradores (não passa pelo WhatsApp). */
    public function alertarAdmin(string $assunto, string $mensagem): void
    {
        $email = Configuracao::first()?->admin_alerta_email;

        $status = 'falhou';
        $erro = null;

        if (empty($email)) {
            $erro = 'Nenhum e-mail de alerta configurado (Configuracao.admin_alerta_email).';
            Log::info("NotificacaoService::alertarAdmin sem destinatário — {$assunto}");
        } else {
            try {
                Mail::raw($mensagem, function ($mail) use ($email, $assunto) {
                    $mail->to($email)->subject($assunto);
                });
                $status = 'enviado';
            } catch (\Throwable $e) {
                $erro = $e->getMessage();
                Log::error('NotificacaoService::alertarAdmin falhou.', ['erro' => $erro]);
            }
        }

        NotificacaoEnviada::create([
            'cerimoniario_id' => null,
            'canal'           => 'email',
            'categoria'       => 'administrativo',
            'destinatario'    => $email,
            'mensagem'        => "{$assunto}\n\n{$mensagem}",
            'status'          => $status,
            'erro'            => $erro,
        ]);
    }

    private function jaEnviado(string $categoria, Model $referencia, int $cerimoniarioId): bool
    {
        return NotificacaoEnviada::where('categoria', $categoria)
            ->where('referencia_type', get_class($referencia))
            ->where('referencia_id', $referencia->id)
            ->where('cerimoniario_id', $cerimoniarioId)
            ->where('status', 'enviado')
            ->exists();
    }

    private function tituloPorCategoria(string $categoria): string
    {
        return match ($categoria) {
            'escala'       => 'Escala publicada',
            'aniversario'  => 'Feliz aniversário!',
            'reuniao'      => 'Convite para reunião',
            'treinamento'  => 'Convite para treinamento',
            'geral'        => 'Comunicado',
            default        => 'Notificação',
        };
    }
}

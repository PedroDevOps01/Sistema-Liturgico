<?php

namespace App\Services;

use App\Models\Cerimoniario;
use App\Models\Comunicado;
use App\Models\NotificacaoEnviada;
use App\Models\User;
use App\Services\Whatsapp\WhatsappChannel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

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

    /**
     * Envia uma notificação via WhatsApp para todos os usuários admin ativos com número cadastrado.
     * Mesma deduplicação por referência do fluxo de cerimoniários (aqui, por número de destino).
     */
    public function alertarAdminWhatsapp(string $mensagem, string $categoria, ?Model $referencia = null): void
    {
        $admins = User::where('ativo', true)->whereNotNull('numero')->where('numero', '!=', '')->get();

        foreach ($admins as $admin) {
            if ($referencia && $this->jaEnviadoAdmin($categoria, $referencia, $admin->numero)) {
                continue;
            }

            $enviado = false;
            $erro = null;

            try {
                $enviado = $this->whatsapp->enviar($admin->numero, $mensagem);
            } catch (\Throwable $e) {
                $erro = $e->getMessage();
                Log::error('NotificacaoService: falha ao enviar WhatsApp para admin.', ['user_id' => $admin->id, 'erro' => $erro]);
            }

            NotificacaoEnviada::create([
                'cerimoniario_id' => null,
                'canal'           => 'whatsapp',
                'categoria'       => $categoria,
                'referencia_type' => $referencia ? get_class($referencia) : null,
                'referencia_id'   => $referencia?->id,
                'destinatario'    => $admin->numero,
                'mensagem'        => $mensagem,
                'status'          => $enviado ? 'enviado' : 'falhou',
                'erro'            => $erro,
            ]);
        }
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

    private function jaEnviadoAdmin(string $categoria, Model $referencia, string $destinatario): bool
    {
        return NotificacaoEnviada::where('categoria', $categoria)
            ->where('referencia_type', get_class($referencia))
            ->where('referencia_id', $referencia->id)
            ->whereNull('cerimoniario_id')
            ->where('destinatario', $destinatario)
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

<?php

namespace App\Services\Whatsapp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Integração com a Evolution API (self-hospedada, baseada em WhatsApp Web).
 *
 * Endpoints e formato de payload conferem com a documentação pública da Evolution API v2
 * (https://doc.evolution-api.com) — ainda não testados contra uma instância real, já que a
 * infraestrutura (chip + instância + QR code) é provisionada pelo usuário. Se o formato divergir
 * na versão específica usada, ajustar apenas os métodos privados abaixo — o resto do sistema
 * conversa só com a interface WhatsappChannel.
 */
class EvolutionApiChannel implements WhatsappChannel
{
    private string $baseUrl;
    private string $apiKey;
    private string $instance;

    public function __construct()
    {
        $this->baseUrl  = rtrim(config('services.evolution.base_url', ''), '/');
        $this->apiKey   = config('services.evolution.api_key', '');
        $this->instance = config('services.evolution.instance', 'default');
    }

    public function enviar(string $numero, string $mensagem): bool
    {
        if (empty($this->baseUrl) || empty($this->apiKey)) {
            Log::warning('EvolutionApiChannel: não configurado (EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes).');
            return false;
        }

        $numeroNormalizado = $this->normalizarNumero($numero);
        if (! $numeroNormalizado) {
            Log::warning("EvolutionApiChannel: número inválido para envio: {$numero}");
            return false;
        }

        try {
            $response = Http::timeout(20)
                ->withHeaders(['apikey' => $this->apiKey])
                ->post("{$this->baseUrl}/message/sendText/{$this->instance}", [
                    'number' => $numeroNormalizado,
                    'text'   => $mensagem,
                ]);

            if ($response->failed()) {
                Log::warning('EvolutionApiChannel: envio falhou.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('EvolutionApiChannel: exceção ao enviar mensagem.', ['erro' => $e->getMessage()]);
            return false;
        }
    }

    public function status(): array
    {
        if (empty($this->baseUrl) || empty($this->apiKey)) {
            return ['conectado' => false, 'detalhe' => 'Evolution API não configurada (.env)'];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['apikey' => $this->apiKey])
                ->get("{$this->baseUrl}/instance/connectionState/{$this->instance}");

            if ($response->failed()) {
                return ['conectado' => false, 'detalhe' => "Erro ao consultar status (HTTP {$response->status()})"];
            }

            $state = $response->json('instance.state') ?? $response->json('state');

            return [
                'conectado' => $state === 'open',
                'detalhe'   => $state ?? 'desconhecido',
            ];
        } catch (\Throwable $e) {
            return ['conectado' => false, 'detalhe' => 'Erro de conexão: ' . $e->getMessage()];
        }
    }

    /** Normaliza pra formato E.164 sem "+" (ex: 5588999998888). Assume DDI 55 (Brasil) se ausente. */
    private function normalizarNumero(string $numero): ?string
    {
        $digitos = preg_replace('/\D/', '', $numero);

        if (empty($digitos)) {
            return null;
        }

        if (strlen($digitos) <= 11) {
            $digitos = '55' . $digitos;
        }

        return $digitos;
    }
}

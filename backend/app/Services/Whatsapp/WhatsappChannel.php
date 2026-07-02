<?php

namespace App\Services\Whatsapp;

interface WhatsappChannel
{
    /** Envia uma mensagem de texto para o número informado. Retorna true se aceito pelo provedor. */
    public function enviar(string $numero, string $mensagem): bool;

    /** Estado da conexão do provedor, ex: ['conectado' => bool, 'detalhe' => string]. */
    public function status(): array;
}

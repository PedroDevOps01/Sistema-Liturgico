<?php
/**
 * Script para gerar credenciais de acesso para cerimoniários existentes
 * que ainda não possuem usuário/senha cadastrados.
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Cerimoniario;
use Illuminate\Support\Facades\Hash;

function normalizar_prefixo(string $nome): string {
    $map = [
        'á'=>'a','à'=>'a','ã'=>'a','â'=>'a','ä'=>'a',
        'é'=>'e','ê'=>'e','ë'=>'e',
        'í'=>'i','î'=>'i','ï'=>'i',
        'ó'=>'o','ô'=>'o','õ'=>'o','ö'=>'o',
        'ú'=>'u','û'=>'u','ü'=>'u',
        'ç'=>'c','ñ'=>'n',
        'Á'=>'a','À'=>'a','Ã'=>'a','Â'=>'a',
        'É'=>'e','Ê'=>'e','Í'=>'i','Ó'=>'o','Ô'=>'o',
        'Õ'=>'o','Ú'=>'u','Ç'=>'c',
    ];
    $s = mb_strtolower(trim($nome), 'UTF-8');
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z]/', '', $s);
    return mb_substr($s, 0, 4, 'UTF-8');
}

// Busca todos os cerimoniários sem usuário
$semAcesso = Cerimoniario::whereNull('usuario')
    ->orWhere('usuario', '')
    ->get();

if ($semAcesso->isEmpty()) {
    echo "✅ Todos os cerimoniários já possuem credenciais de acesso.\n";
    exit(0);
}

echo "🔑 Criando credenciais para {$semAcesso->count()} cerimoniários...\n\n";
echo str_pad('Nome', 35) . str_pad('Usuário', 25) . "Senha Provisória\n";
echo str_repeat('-', 80) . "\n";

foreach ($semAcesso as $c) {
    $usuario = Cerimoniario::gerarUsuario($c->nome);

    // Senha: 4 primeiras letras do nome (sem acento) + ano de nascimento (ou 1234)
    $prefixo  = normalizar_prefixo($c->nome);
    $anoNasc  = $c->data_nascimento ? $c->data_nascimento->format('Y') : '1234';
    $senhaPlana = $prefixo . $anoNasc;

    $c->usuario = $usuario;
    $c->senha   = Hash::make($senhaPlana);
    $c->save();

    echo str_pad(mb_substr($c->nome, 0, 33, 'UTF-8'), 35)
       . str_pad($usuario, 25)
       . $senhaPlana . "\n";
}

echo str_repeat('-', 80) . "\n";
echo "\n✅ Credenciais criadas com sucesso!\n";
echo "⚠️  Anote as senhas acima — não ficam salvas em texto puro.\n";
echo "ℹ️  Cerimoniários podem alterar a senha em /membro/perfil\n";

<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BuscaController;
use App\Http\Controllers\API\ChatController;
use App\Http\Controllers\API\ConfirmacaoController;
use App\Http\Controllers\API\ConsultaRapidaController;
use App\Http\Controllers\API\CelebracaoController;
use App\Http\Controllers\API\CerimoniarioController;
use App\Http\Controllers\API\ConfiguracaoController;
use App\Http\Controllers\API\ConflitosController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\EscalaController;
use App\Http\Controllers\API\EstatisticasController;
use App\Http\Controllers\API\FuncaoController;
use App\Http\Controllers\API\InteressadoController;
use App\Http\Controllers\API\PresencaController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\PortalStatsController;
use App\Http\Controllers\API\PortalImageController;
use App\Http\Controllers\API\AnalyticsController;
use App\Http\Controllers\API\RelatorioMensalController;
use App\Http\Controllers\API\TunicaController;
use App\Http\Controllers\API\FormacaoController;
use App\Http\Controllers\API\RelatorioController;
use App\Http\Controllers\API\TreinamentoController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::get('/portal-stats', PortalStatsController::class);
Route::get('/portal-config', [ConfiguracaoController::class, 'showPortalConfig']);
Route::post('/interessados', [InteressadoController::class, 'store']);
Route::get('/confirmar/{token}', [ConfirmacaoController::class, 'show']);
Route::post('/confirmar/{token}', [ConfirmacaoController::class, 'update']);
// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/consulta', [ConsultaRapidaController::class, 'consultar']);
    Route::post('/chat', [ChatController::class, 'chat']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Busca global
    Route::get('/busca', [BuscaController::class, 'index']);

    // Interessados
    Route::get('interessados', [InteressadoController::class, 'index']);
    Route::patch('interessados/{interessado}/marcar-lido', [InteressadoController::class, 'marcarLido']);
    Route::delete('interessados/{interessado}', [InteressadoController::class, 'destroy']);

    // Users
    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::patch('users/{user}/toggle-ativo', [UserController::class, 'toggleAtivo']);

    // Cerimoniários
    Route::get('cerimoniarios/aniversarios', [CerimoniarioController::class, 'aniversarios']);
    Route::apiResource('cerimoniarios', CerimoniarioController::class);
    Route::get('cerimoniarios/{id}/disponibilidade', [CerimoniarioController::class, 'disponibilidade']);
    Route::get('cerimoniarios/{id}/dashboard', [CerimoniarioController::class, 'dashboard']);
    Route::patch('cerimoniarios/{cerimoniario}/toggle-ativo', [CerimoniarioController::class, 'toggleAtivo']);

    // Celebrações
    Route::get('celebracoes/sem-escala', [CelebracaoController::class, 'semEscala']);
    Route::patch('celebracoes/{celebracao}/toggle-ativo', [CelebracaoController::class, 'toggleAtivo']);
    Route::get('celebracoes/grupo', [CelebracaoController::class, 'porGrupo']);
    Route::post('celebracoes/batch', [CelebracaoController::class, 'storeBatch']);
    Route::apiResource('celebracoes', CelebracaoController::class)
        ->parameters(['celebracoes' => 'celebracao']);

    // Escalas
    Route::get('historico', [EscalaController::class, 'historico']);
    Route::get('escalas/sugerir', [EscalaController::class, 'sugerir']);
    Route::post('escalas/gerar-estrutura', [EscalaController::class, 'gerarEstrutura']);
    Route::patch('escalas/{escala}/toggle-ativo', [EscalaController::class, 'toggleAtivo']);
    Route::get('escalas/ultima', [EscalaController::class, 'ultima']);
    Route::get('escalas/conflitos-data', [EscalaController::class, 'conflitosData']);
    Route::get('escalas/{id}/whatsapp', [EscalaController::class, 'copiarWhatsapp']);
    Route::get('escalas/{id}/pdf', [EscalaController::class, 'gerarPdf']);
    Route::post('escalas/{id}/duplicar', [EscalaController::class, 'duplicar']);
    Route::apiResource('escalas', EscalaController::class);

    // Funções
    Route::get('funcoes', [FuncaoController::class, 'index']);

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Configurações
    Route::get('configuracoes', [ConfiguracaoController::class, 'show']);
    Route::put('configuracoes', [ConfiguracaoController::class, 'update']);
    Route::post('configuracoes/logo', [ConfiguracaoController::class, 'uploadLogo']);

    // Upload de imagens do portal
    Route::post('portal-images', [PortalImageController::class, 'upload']);
    Route::delete('portal-images', [PortalImageController::class, 'destroy']);

    // Presenças
    Route::put('escala-itens/{item}/presenca', [PresencaController::class, 'update']);

    // Conflitos
    Route::get('conflitos/verificar', [ConflitosController::class, 'verificar']);

    // Estatísticas
    Route::get('estatisticas', [EstatisticasController::class, 'index']);

    // Relatórios
    Route::get('relatorios/presencas', [RelatorioController::class, 'presencas']);
    Route::get('relatorios/frequencia/{cerimoniario}', [RelatorioController::class, 'frequencia']);
    Route::get('relatorios/crescimento', [RelatorioController::class, 'crescimento']);
    Route::get('relatorios/treinamentos', [RelatorioController::class, 'treinamentos']);
    Route::get('relatorios/emprestimos', [RelatorioController::class, 'emprestimos']);
    Route::get('relatorios/assiduidade', [RelatorioController::class, 'assiduidade']);

    // Analytics
    Route::get('analytics', [AnalyticsController::class, 'index']);

    // Relatório mensal
    Route::get('relatorio/mensal/status', [RelatorioMensalController::class, 'status']);
    Route::post('relatorio/mensal/marcar-recebido', [RelatorioMensalController::class, 'marcarRecebido']);
    Route::get('relatorio/mensal/{year}/{month}', [RelatorioMensalController::class, 'download']);

    // Treinamentos
    Route::get('treinamentos/{treinamento}/convite', [\App\Http\Controllers\API\TreinamentoController::class, 'convite']);
    Route::put('treinamentos/{treinamento}/presencas/{cerimoniario}', [\App\Http\Controllers\API\TreinamentoController::class, 'updatePresenca']);
    Route::apiResource('treinamentos', \App\Http\Controllers\API\TreinamentoController::class);

    // Túnicas
    Route::get('tunicas/disponiveis', [TunicaController::class, 'disponiveis']);
    Route::get('tunicas/{tunica}/historico', [TunicaController::class, 'historico']);
    Route::post('tunicas/{tunica}/emprestar', [TunicaController::class, 'emprestar']);
    Route::post('tunicas/{tunica}/devolver', [TunicaController::class, 'devolver']);
    Route::post('tunicas/{tunica}/perdida', [TunicaController::class, 'marcarPerdida']);
    Route::post('tunicas/{tunica}/encontrada', [TunicaController::class, 'marcarEncontrada']);
    Route::apiResource('tunicas', TunicaController::class);

    // Formação Litúrgica
    Route::get('formacao/niveis', [FormacaoController::class, 'niveis']);
    Route::post('formacao/niveis', [FormacaoController::class, 'storeNivel']);
    Route::put('formacao/niveis/{nivel}', [FormacaoController::class, 'updateNivel']);
    Route::delete('formacao/niveis/{nivel}', [FormacaoController::class, 'destroyNivel']);
    Route::post('formacao/niveis/{nivel}/competencias', [FormacaoController::class, 'storeCompetencia']);
    Route::put('formacao/competencias/{competencia}', [FormacaoController::class, 'updateCompetencia']);
    Route::delete('formacao/competencias/{competencia}', [FormacaoController::class, 'destroyCompetencia']);
    Route::get('formacao/overview', [FormacaoController::class, 'overview']);
    Route::get('formacao/cerimoniario/{cerimoniario}/certificado/{nivel}', [FormacaoController::class, 'certificado']);
    Route::get('formacao/cerimoniario/{cerimoniario}/historico', [FormacaoController::class, 'historico']);
    Route::get('formacao/cerimoniario/{cerimoniario}', [FormacaoController::class, 'progressoCerimoniario']);
    Route::put('formacao/cerimoniario/{cerimoniario}/competencia/{competencia}', [FormacaoController::class, 'updateProgresso']);

    // Auditoria
    Route::get('auditorias/tabelas', [\App\Http\Controllers\API\AuditoriaController::class, 'tabelas']);
    Route::get('auditorias', [\App\Http\Controllers\API\AuditoriaController::class, 'index']);
});

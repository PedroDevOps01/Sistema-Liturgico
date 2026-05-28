<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\CelebracaoController;
use App\Http\Controllers\API\CerimoniarioController;
use App\Http\Controllers\API\ConfiguracaoController;
use App\Http\Controllers\API\ConflitosController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\EscalaController;
use App\Http\Controllers\API\EstatisticasController;
use App\Http\Controllers\API\FuncaoController;
use App\Http\Controllers\API\PresencaController;
use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Users
    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::patch('users/{user}/toggle-ativo', [UserController::class, 'toggleAtivo']);

    // Cerimoniários
    Route::apiResource('cerimoniarios', CerimoniarioController::class);
    Route::get('cerimoniarios/{id}/disponibilidade', [CerimoniarioController::class, 'disponibilidade']);
    Route::patch('cerimoniarios/{cerimoniario}/toggle-ativo', [CerimoniarioController::class, 'toggleAtivo']);

    // Celebrações
    Route::get('celebracoes/sem-escala', [CelebracaoController::class, 'semEscala']);
    Route::get('celebracoes/grupo', [CelebracaoController::class, 'porGrupo']);
    Route::post('celebracoes/batch', [CelebracaoController::class, 'storeBatch']);
    Route::apiResource('celebracoes', CelebracaoController::class);

    // Escalas
    Route::post('escalas/gerar-estrutura', [EscalaController::class, 'gerarEstrutura']);
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

    // Presenças
    Route::put('escala-itens/{item}/presenca', [PresencaController::class, 'update']);

    // Conflitos
    Route::get('conflitos/verificar', [ConflitosController::class, 'verificar']);

    // Estatísticas
    Route::get('estatisticas', [EstatisticasController::class, 'index']);
});

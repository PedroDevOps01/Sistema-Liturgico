<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use App\Models\Comunicado;
use App\Services\NotificacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComunicadoController extends Controller
{
    public function __construct(private NotificacaoService $notificacao)
    {
    }

    /** Lista os comunicados gerais (não lista os pessoais/automáticos, que aparecem só pro destinatário no portal). */
    public function index(): JsonResponse
    {
        $comunicados = Comunicado::where('categoria', 'geral')
            ->with('cerimoniario:id,nome')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data'    => $comunicados,
            'message' => 'Comunicados listados com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'             => 'required|string|max:255',
            'corpo'              => 'required|string',
            'tipo'               => 'nullable|in:info,aviso,urgente',
            'expira_em'          => 'nullable|date',
            'destinatario_tipo'  => 'required|in:todos,individual,perfil',
            'cerimoniario_ids'   => 'required_if:destinatario_tipo,individual|array',
            'cerimoniario_ids.*' => 'exists:cerimoniarios,id',
            'perfil'             => 'required_if:destinatario_tipo,perfil|in:experiente,mestre',
            'canal'              => 'required|in:portal,whatsapp,ambos',
        ]);

        $tipo          = $validated['tipo'] ?? 'info';
        $enviaWhatsapp = in_array($validated['canal'], ['whatsapp', 'ambos']);
        $mensagemWhats = "*{$validated['titulo']}*\n\n{$validated['corpo']}";

        if ($validated['destinatario_tipo'] === 'todos') {
            if ($enviaWhatsapp) {
                $destinatarios = Cerimoniario::where('ativo', true)->get();
                $destinatarios->each(fn (Cerimoniario $c) => $this->notificacao->enviarParaCerimoniario(
                    $c, $mensagemWhats, 'geral', null, $validated['titulo'], $tipo, $validated['corpo']
                ));

                return response()->json([
                    'data'    => null,
                    'message' => "Comunicado enviado a {$destinatarios->count()} cerimoniário(s).",
                ], 201);
            }

            $comunicado = Comunicado::create([
                'titulo'          => $validated['titulo'],
                'corpo'           => $validated['corpo'],
                'tipo'            => $tipo,
                'ativo'           => true,
                'expira_em'       => $validated['expira_em'] ?? null,
                'cerimoniario_id' => null,
                'categoria'       => 'geral',
                'canal'           => 'portal',
            ]);

            return response()->json(['data' => $comunicado, 'message' => 'Comunicado criado com sucesso.'], 201);
        }

        $destinatarios = $validated['destinatario_tipo'] === 'individual'
            ? Cerimoniario::whereIn('id', $validated['cerimoniario_ids'])->get()
            : Cerimoniario::where('ativo', true)->where($validated['perfil'], true)->get();

        $criados = [];
        foreach ($destinatarios as $c) {
            if ($enviaWhatsapp) {
                $this->notificacao->enviarParaCerimoniario(
                    $c, $mensagemWhats, 'geral', null, $validated['titulo'], $tipo, $validated['corpo']
                );
            } else {
                $criados[] = Comunicado::create([
                    'titulo'          => $validated['titulo'],
                    'corpo'           => $validated['corpo'],
                    'tipo'            => $tipo,
                    'ativo'           => true,
                    'expira_em'       => $validated['expira_em'] ?? null,
                    'cerimoniario_id' => $c->id,
                    'categoria'       => 'geral',
                    'canal'           => 'portal',
                ]);
            }
        }

        return response()->json([
            'data'    => $criados,
            'message' => "Comunicado enviado a {$destinatarios->count()} cerimoniário(s).",
        ], 201);
    }

    public function update(Request $request, Comunicado $comunicado): JsonResponse
    {
        $validated = $request->validate([
            'titulo'    => 'sometimes|string|max:255',
            'corpo'     => 'sometimes|string',
            'tipo'      => 'nullable|in:info,aviso,urgente',
            'ativo'     => 'sometimes|boolean',
            'expira_em' => 'nullable|date',
        ]);

        $comunicado->update($validated);

        return response()->json(['data' => $comunicado, 'message' => 'Comunicado atualizado com sucesso.']);
    }

    public function destroy(Comunicado $comunicado): JsonResponse
    {
        $comunicado->delete();

        return response()->json(['data' => null, 'message' => 'Comunicado removido com sucesso.']);
    }
}

<?php
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Documento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentoController extends Controller
{
    public function index(): JsonResponse
    {
        $lista = Documento::orderBy('tipo')->orderBy('titulo')
            ->get(['id', 'titulo', 'descricao', 'tipo', 'arquivo_nome', 'mime_type', 'ativo', 'created_at', 'conteudo_estruturado']);
        return response()->json($lista);
    }

    public function show(Documento $documento): JsonResponse
    {
        return response()->json([
            'id'                   => $documento->id,
            'titulo'               => $documento->titulo,
            'descricao'            => $documento->descricao,
            'tipo'                 => $documento->tipo,
            'arquivo_nome'         => $documento->arquivo_nome,
            'mime_type'            => $documento->mime_type,
            'ativo'                => $documento->ativo,
            'created_at'           => $documento->created_at,
            'conteudo_estruturado' => $documento->conteudo_estruturado,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'               => 'required|string|max:255',
            'descricao'            => 'nullable|string',
            'tipo'                 => 'required|in:ordo,roteiro,norma,formacao,outro',
            'arquivo_nome'         => 'required|string|max:255',
            'arquivo_base64'       => 'required|string',
            'mime_type'            => 'nullable|string|max:100',
            'conteudo_estruturado' => 'nullable|array',
        ]);

        $doc = Documento::create([
            ...$validated,
            'mime_type' => $validated['mime_type'] ?? 'application/pdf',
        ]);

        return response()->json($doc, 201);
    }

    public function update(Request $request, Documento $documento): JsonResponse
    {
        $validated = $request->validate([
            'titulo'               => 'sometimes|string|max:255',
            'descricao'            => 'nullable|string',
            'tipo'                 => 'sometimes|in:ordo,roteiro,norma,formacao,outro',
            'ativo'                => 'sometimes|boolean',
            'conteudo_estruturado' => 'nullable|array',
        ]);
        $documento->update($validated);
        return response()->json($documento);
    }

    public function destroy(Documento $documento): JsonResponse
    {
        $documento->delete();
        return response()->json(['message' => 'Documento removido.']);
    }
}

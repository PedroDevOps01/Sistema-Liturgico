<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Cerimoniario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class MembroAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'usuario'  => 'required|string',
            'password' => 'required|string',
        ]);

        $cerimoniario = Cerimoniario::where('usuario', $request->usuario)
            ->where('ativo', true)
            ->first();

        if (! $cerimoniario || ! $cerimoniario->senha || ! Hash::check($request->password, $cerimoniario->senha)) {
            throw ValidationException::withMessages([
                'usuario' => ['Credenciais inválidas ou acesso não configurado.'],
            ]);
        }

        $token = $cerimoniario->createToken('membro-token', ['membro'])->plainTextToken;

        return response()->json([
            'data' => [
                'cerimoniario' => $cerimoniario,
                'token'        => $token,
            ],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data'    => $request->user(),
            'message' => 'Membro autenticado.',
        ]);
    }

    public function updateSenha(Request $request): JsonResponse
    {
        $request->validate([
            'senha_atual' => 'required|string',
            'senha_nova'  => 'required|string|min:6',
        ]);

        /** @var Cerimoniario $cerimoniario */
        $cerimoniario = $request->user();

        if (! Hash::check($request->senha_atual, $cerimoniario->senha)) {
            throw ValidationException::withMessages([
                'senha_atual' => ['Senha atual incorreta.'],
            ]);
        }

        $cerimoniario->update(['senha' => Hash::make($request->senha_nova)]);

        return response()->json(['message' => 'Senha alterada com sucesso.']);
    }
}

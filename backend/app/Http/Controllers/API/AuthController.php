<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'usuario' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt(['usuario' => $request->usuario, 'password' => $request->password])) {
            throw ValidationException::withMessages([
                'usuario' => ['As credenciais fornecidas estão incorretas.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->ativo) {
            Auth::logout();

            return response()->json([
                'message' => 'Usuário inativo. Contate o administrador.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'data' => null,
            'message' => 'Logout realizado com sucesso.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user(),
            'message' => 'Usuário autenticado.',
        ]);
    }
}

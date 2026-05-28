<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('nome')->get();

        return response()->json([
            'data' => $users,
            'message' => 'Usuários listados com sucesso.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'usuario' => 'required|string|max:255|unique:users,usuario',
            'password' => 'required|string|min:6',
            'ativo' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'data' => $user,
            'message' => 'Usuário criado com sucesso.',
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user,
            'message' => 'Usuário encontrado.',
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255',
            'usuario' => 'sometimes|string|max:255|unique:users,usuario,' . $user->id,
            'password' => 'sometimes|string|min:6|nullable',
            'ativo' => 'sometimes|boolean',
        ]);

        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'data' => $user->fresh(),
            'message' => 'Usuário atualizado com sucesso.',
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete(); // soft delete

        return response()->json([
            'data' => null,
            'message' => 'Usuário excluído com sucesso.',
        ]);
    }

    public function toggleAtivo(User $user): JsonResponse
    {
        $user->update(['ativo' => ! $user->ativo]);

        return response()->json([
            'data' => $user->fresh(),
            'message' => $user->ativo ? 'Usuário ativado.' : 'Usuário desativado.',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'data' => null,
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }
}

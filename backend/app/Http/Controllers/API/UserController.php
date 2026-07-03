<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $query = User::orderBy('nome');
        if (! request()->boolean('todos')) {
            $query->where('ativo', true);
        }
        $users = $query->get();

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
            'numero' => 'nullable|string|max:30',
            'password' => 'required|string|min:6',
            'ativo' => 'boolean',
        ]);

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
            'numero' => 'nullable|string|max:30',
            'password' => 'sometimes|string|min:6|nullable',
            'ativo' => 'sometimes|boolean',
        ]);

        if (! (isset($validated['password']) && $validated['password'])) {
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
        DB::table('users')->where('id', $user->id)->update(['ativo' => false, 'updated_at' => now()]);

        return response()->json([
            'data' => null,
            'message' => 'Usuário inativado com sucesso.',
        ]);
    }

    public function toggleAtivo(User $user): JsonResponse
    {
        $novoAtivo = ! $user->ativo;
        DB::table('users')->where('id', $user->id)->update(['ativo' => $novoAtivo, 'updated_at' => now()]);

        $userAtualizado = User::find($user->id);
        return response()->json([
            'data' => $userAtualizado,
            'message' => $novoAtivo ? 'Usuário ativado.' : 'Usuário desativado.',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user->update([
            'password' => $validated['password'],
        ]);

        return response()->json([
            'data' => null,
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\Cerimoniario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMembro
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof Cerimoniario) {
            return response()->json(['message' => 'Acesso restrito ao portal do membro.'], 403);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortalImageController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:8192',
        ]);

        $path = $request->file('image')->store('portal', 'public');

        return response()->json([
            'url' => url('storage/' . $path),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);

        // Extrai só o caminho relativo a partir de "storage/"
        $relative = preg_replace('#^.*/storage/#', '', $request->path);
        Storage::disk('public')->delete($relative);

        return response()->json(['ok' => true]);
    }
}

<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Whatsapp\WhatsappChannel;
use Illuminate\Http\JsonResponse;

class WhatsappController extends Controller
{
    public function status(WhatsappChannel $whatsapp): JsonResponse
    {
        return response()->json([
            'data'    => $whatsapp->status(),
            'message' => 'Status da conexão do WhatsApp.',
        ]);
    }
}

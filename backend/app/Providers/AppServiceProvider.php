<?php

namespace App\Providers;

use App\Services\Whatsapp\EvolutionApiChannel;
use App\Services\Whatsapp\WhatsappChannel;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Trocar de provedor de WhatsApp no futuro é mudar este bind, não a lógica de negócio.
        $this->app->bind(WhatsappChannel::class, EvolutionApiChannel::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

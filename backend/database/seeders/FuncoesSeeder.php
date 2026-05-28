<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FuncoesSeeder extends Seeder
{
    public function run(): void
    {
        $funcoes = [
            [
                'titulo' => 'Cerimoniário - Mestre',
                'descricao' => 'Responsável principal pela condução da equipe litúrgica',
                'ordem' => 1,
                'ativo' => true,
            ],
            [
                'titulo' => 'Primeiro Auxiliar - Microfone',
                'descricao' => 'Responsável pelo microfone e apoio inicial',
                'ordem' => 2,
                'ativo' => true,
            ],
            [
                'titulo' => 'Segundo Auxiliar - Missal',
                'descricao' => 'Responsável pelo missal',
                'ordem' => 3,
                'ativo' => true,
            ],
            [
                'titulo' => 'Terceiro Auxiliar - Leitores',
                'descricao' => 'Responsável pelo apoio aos leitores',
                'ordem' => 4,
                'ativo' => true,
            ],
            [
                'titulo' => 'Quarto Auxiliar - Preces, Intenções e Avisos',
                'descricao' => 'Responsável pelas preces e avisos',
                'ordem' => 5,
                'ativo' => true,
            ],
            [
                'titulo' => 'Quinto Auxiliar - Turiferário',
                'descricao' => 'Responsável pelo turíbulo/incenso',
                'ordem' => 6,
                'ativo' => true,
            ],
            [
                'titulo' => 'Môr',
                'descricao' => 'Responsável pelo Bispo ou Arcebispo durante a celebração',
                'ordem' => 7,
                'ativo' => true,
            ],
            [
                'titulo' => 'Mitra',
                'descricao' => 'Responsável pela mitra/chapéu cerimonial',
                'ordem' => 8,
                'ativo' => true,
            ],
            [
                'titulo' => 'Bácula',
                'descricao' => 'Responsável pela bácula/cajado pastoral',
                'ordem' => 9,
                'ativo' => true,
            ],
        ];

        foreach ($funcoes as $funcao) {
            DB::table('funcoes')->updateOrInsert(
                ['titulo' => $funcao['titulo']],
                array_merge($funcao, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}

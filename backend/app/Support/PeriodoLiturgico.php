<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Numeração da semana do Tempo Comum pra exibição (ex: "Tempo Comum XIV").
 * Mesma regra usada no frontend (frontend/src/lib/liturgico.ts): contada
 * regressivamente a partir da semana 34 = Cristo Rei, véspera do Advento.
 * Não altera o enum salvo em `periodo_liturgico` — é só formatação de exibição.
 */
class PeriodoLiturgico
{
    private const ROMAN_TABLE = [
        1000 => 'M', 900 => 'CM', 500 => 'D', 400 => 'CD',
        100 => 'C', 90 => 'XC', 50 => 'L', 40 => 'XL',
        10 => 'X', 9 => 'IX', 5 => 'V', 4 => 'IV', 1 => 'I',
    ];

    public static function comNumero(?string $periodo, string|Carbon|null $data): string
    {
        if (! $periodo) {
            return '';
        }
        if ($periodo !== 'Tempo Comum' || ! $data) {
            return $periodo;
        }

        $date   = self::toDateOnly($data);
        $semana = self::semanaTempoComum($date);

        return $semana !== null ? "Tempo Comum {$semana}" : $periodo;
    }

    private static function toDateOnly(string|Carbon $data): Carbon
    {
        $c = $data instanceof Carbon ? $data->copy() : Carbon::parse(substr($data, 0, 10));

        return $c->startOfDay();
    }

    private static function diffDays(Carbon $a, Carbon $b): int
    {
        return (int) round(($a->getTimestamp() - $b->getTimestamp()) / 86400);
    }

    private static function sundayOnOrBefore(Carbon $d): Carbon
    {
        return $d->copy()->subDays($d->dayOfWeek); // dayOfWeek: 0 = domingo
    }

    private static function easter(int $year): Carbon
    {
        return Carbon::create($year, 3, 21)->startOfDay()->addDays(easter_days($year));
    }

    private static function epiphany(int $year): Carbon
    {
        for ($d = 2; $d <= 8; $d++) {
            $date = Carbon::create($year, 1, $d)->startOfDay();
            if ($date->dayOfWeek === 0) {
                return $date;
            }
        }

        return Carbon::create($year, 1, 6)->startOfDay();
    }

    private static function baptism(int $year): Carbon
    {
        return self::epiphany($year)->addDays(7);
    }

    private static function adventStart(int $year): Carbon
    {
        $christmas = Carbon::create($year, 12, 25)->startOfDay();
        $dow       = $christmas->dayOfWeek;
        $daysBack  = $dow === 0 ? 28 : $dow + 21;

        return $christmas->copy()->subDays($daysBack);
    }

    private static function semanaTempoComum(Carbon $date): ?string
    {
        $year        = $date->year;
        $easter      = self::easter($year);
        $ashWed      = $easter->copy()->subDays(46);
        $adventStart = self::adventStart($year);
        $baptism     = self::baptism($year);

        if ($date->eq($baptism)) {
            return null;
        }

        $sunday = self::sundayOnOrBefore($date);

        if ($date->gt($baptism) && $date->lt($ashWed)) {
            $n = self::diffDays($sunday, $baptism) / 7 + 1;

            return self::toRoman((int) round($n));
        }

        $sunday34 = $adventStart->copy()->subDays(7);
        $n        = 34 - self::diffDays($sunday34, $sunday) / 7;

        return self::toRoman((int) round($n));
    }

    private static function toRoman(int $n): string
    {
        $num = $n;
        $out = '';
        foreach (self::ROMAN_TABLE as $value => $symbol) {
            while ($num >= $value) {
                $out .= $symbol;
                $num -= $value;
            }
        }

        return $out;
    }
}

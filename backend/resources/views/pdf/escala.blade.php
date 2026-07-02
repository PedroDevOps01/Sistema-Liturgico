<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Ministério dos Acólitos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            color: #1a1a1a;
            background: #fff;
            padding: 28px 36px;
        }

        /* ── Header ── */
        .header {
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 3px solid #111;
            padding-bottom: 12px;
            margin-bottom: 14px;
        }
        .header .logo { max-height: 60px; max-width: 60px; }
        .header .info-right { flex: 1; }
        .header .nome-paroquia {
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .header .titulo-doc {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 2px;
        }
        .badge-periodo {
            display: inline-block;
            background: #111;
            color: #facc15;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 3px;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* ── Compact Escala Block ── */
        .escala-block {
            background: #f8f8f8;
            border-left: 4px solid #111;
            padding: 8px 12px;
            margin-bottom: 4px;
            border-radius: 0 4px 4px 0;
        }
        .escala-block .periodo-line {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #444;
            margin-bottom: 2px;
        }
        .escala-block .dia-line {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 1px;
        }
        .escala-block .horario-line {
            font-size: 11px;
            color: #555;
            margin-bottom: 6px;
        }

        /* ── Team rows ── */
        .team-row {
            display: flex;
            gap: 4px;
            padding: 3px 0;
            border-bottom: 1px solid #ececec;
            align-items: baseline;
        }
        .team-row:last-child { border-bottom: none; }
        .team-label {
            font-weight: bold;
            color: #111;
            min-width: 120px;
            font-size: 11px;
        }
        .team-name {
            color: #222;
            font-size: 11px;
        }
        .team-empty {
            color: #aaa;
            font-style: italic;
            font-size: 11px;
        }

        /* ── Observation ── */
        .obs-block {
            margin-top: 10px;
            padding: 6px 10px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 4px;
            font-size: 10px;
            color: #666;
        }

        /* ── Nomenclatura legend ── */
        .nomenclatura {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 2px solid #111;
        }
        .nomenclatura .title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
            color: #111;
        }
        .nomenclatura table {
            width: 100%;
            border-collapse: collapse;
        }
        .nomenclatura td {
            font-size: 10px;
            padding: 2px 6px;
            color: #333;
            vertical-align: top;
        }
        .nomenclatura td.label-col {
            font-weight: bold;
            width: 90px;
            color: #111;
            white-space: nowrap;
        }
        .nomenclatura .obs-nom {
            margin-top: 6px;
            font-size: 10px;
            color: #666;
            font-style: italic;
        }

        /* ── Footer ── */
        .footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #e0e0e0;
            font-size: 9px;
            color: #999;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
    @if($configuracao && $configuracao->logo_base64)
        <img class="logo" src="{{ $configuracao->logo_base64 }}" alt="Logo">
    @endif
    <div class="info-right">
        <div class="nome-paroquia">{{ $configuracao ? $configuracao->nome_paroquia : 'Paróquia' }}</div>
        <div class="titulo-doc">Ministério dos Acólitos</div>
        <div><span class="badge-periodo">{{ strtoupper($escala->celebracao->periodo_liturgico) }}</span></div>
    </div>
</div>

{{-- ── Helpers ── --}}
@php
    function pdfAbbr(string $label): string {
        $l = mb_strtolower($label);
        if (str_contains($l, 'mestre') || (str_starts_with($l, 'cerimoni') && !str_contains($l, 'aux'))) return 'Cerimoniário';
        if (str_contains($l, 'auxiliar 1') || str_contains($l, 'primeiro') || str_contains($l, 'microfone')) return '1ª Aux';
        if (str_contains($l, 'auxiliar 2') || str_contains($l, 'segundo')  || str_contains($l, 'missal'))    return '2ª Aux';
        if (str_contains($l, 'auxiliar 3') || str_contains($l, 'terceiro') || str_contains($l, 'leitor'))    return '3ª Aux';
        if (str_contains($l, 'auxiliar 4') || str_contains($l, 'quarto')   || str_contains($l, 'prece'))     return '4ª Aux';
        if (str_contains($l, 'auxiliar 5') || str_contains($l, 'quinto')   || str_contains($l, 'turifer'))   return '5ª Aux';
        return $label;
    }

    $cel    = $escala->celebracao;
    $hArr   = explode(':', substr($cel->horario, 0, 5));
    $h      = intval($hArr[0]);
    $m      = intval($hArr[1] ?? 0);
    $hCmpct = $m === 0 ? "{$h}h" : "{$h}h" . str_pad($m, 2, '0', STR_PAD_LEFT);
    $data   = \Carbon\Carbon::parse($cel->data)->format('d/m');
    $dataBR = \Carbon\Carbon::parse($cel->data)->locale('pt_BR')->isoFormat('D [de] MMMM [de] YYYY');

    $tipo = 'Missa';
    if ($cel->casamento)               $tipo = 'Casamento';
    elseif ($cel->batismo)             $tipo = 'Batismo';
    elseif ($cel->crisma)              $tipo = 'Crisma';
    elseif ($cel->primeira_eucaristia) $tipo = 'Primeira Eucaristia';
    elseif ($cel->quinta_eucaristica)  $tipo = 'Quinta Eucarística';
    elseif ($cel->triduo)              $tipo = 'Tríduo';
    elseif ($cel->ordenacao)           $tipo = 'Ordenação';
    elseif ($cel->exequias)            $tipo = 'Exéquias';
    elseif ($cel->vigilia_pascal)      $tipo = 'Vigília Pascal';
    elseif ($cel->paixao_senhor)       $tipo = 'Paixão do Senhor';
    elseif ($cel->corpus_christi)      $tipo = 'Corpus Christi';
    elseif ($cel->missa_crismal)       $tipo = 'Missa Crismal';
    elseif ($cel->missa_pontifical)    $tipo = 'Missa Pontifical';
    elseif ($cel->adoracao_santissimo) $tipo = 'Adoração ao Santíssimo';
    elseif ($cel->procissao)           $tipo = 'Procissão';
    elseif ($cel->via_sacra)           $tipo = 'Via-Sacra';
    elseif ($cel->celebracao_palavra)  $tipo = 'Celebração da Palavra';
    elseif ($cel->celebracao_solene)   $tipo = 'Missa Solene';

    $flags = [];
    if ($cel->celebracao_noite) $flags[] = 'Noturna';
    if ($cel->possui_bispo)     $flags[] = 'Com Bispo';
@endphp

{{-- ── Compact Escala Block ── --}}
<div class="escala-block">
    <div class="periodo-line">{{ strtoupper($cel->periodo_liturgico) }}</div>
    <div class="dia-line">DIA {{ $data }} — {{ $dataBR }}</div>
    <div class="horario-line">
        {{ $tipo }} às {{ $hCmpct }}
        @if(count($flags)) &nbsp;·&nbsp; {{ implode(' · ', $flags) }} @endif
    </div>

    {{-- Team rows ── --}}
    @foreach($escala->escalaItens->sortBy('ordem') as $item)
        @php
            $raw    = $item->funcao_label ?? ($item->funcao ? $item->funcao->titulo : 'Função');
            $abbr   = pdfAbbr($raw);
            $nome   = $item->cerimoniario ? $item->cerimoniario->nome : null;
            $mestre = $item->cerimoniario && $item->cerimoniario->mestre;
        @endphp
        <div class="team-row">
            <span class="team-label">@if($mestre)M - @endif{{ $abbr }}:</span>
            @if($nome)
                <span class="team-name">{{ $nome }}</span>
            @else
                <span class="team-empty">A escalar</span>
            @endif
        </div>
    @endforeach
</div>

{{-- Observação ── --}}
@if($escala->observacao)
    <div class="obs-block"><strong>Obs:</strong> {{ $escala->observacao }}</div>
@endif

{{-- ── Nomenclatura legend ── --}}
<div class="nomenclatura">
    <div class="title">Nomenclatura do Serviço</div>
    <table>
        <tr>
            <td class="label-col">1ª AUX:</td>
            <td>Lado direito (microfone)</td>
            <td class="label-col">2ª AUX:</td>
            <td>Lado esquerdo (missal)</td>
        </tr>
        <tr>
            <td class="label-col">3ª AUX:</td>
            <td>Leitores</td>
            <td class="label-col">4ª AUX:</td>
            <td>Preces, intenções e avisos</td>
        </tr>
        <tr>
            <td class="label-col">5ª AUX:</td>
            <td colspan="3">Turiferário (somente à noite)</td>
        </tr>
    </table>
    <div class="obs-nom">
        Obs: Nas Missas da manhã, só vai até 4ª AUX, pois não há turíbulo nesses horários.
    </div>
</div>

{{-- ── Footer ── --}}
<div class="footer">
    <span>Gerado em {{ now()->format('d/m/Y à\s H:i') }}</span>
    <span>
        {{ $configuracao ? $configuracao->nome_paroquia : '' }}
        {{ $configuracao && $configuracao->nome_coordenador ? '· Coord: '.$configuracao->nome_coordenador : '' }}
    </span>
</div>

</body>
</html>

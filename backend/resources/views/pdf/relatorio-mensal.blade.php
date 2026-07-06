<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Mensal — {{ ucfirst($label) }} · Ministério dos Acólitos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1f2937; background: #fff; }

    /* ── Header ─────────────────────────────────────────── */
    .header { background: #7c2d12; color: white; padding: 30px 36px 24px; position: relative; overflow: hidden; }
    .header-blob1 { position: absolute; top: -30px; right: -30px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,0.06); }
    .header-blob2 { position: absolute; bottom: -40px; right: 120px; width: 110px; height: 110px; border-radius: 50%; background: rgba(255,255,255,0.04); }
    .header-eyebrow { font-size: 9px; font-weight: bold; letter-spacing: 2.5px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px; }
    .header h1 { font-size: 22px; font-weight: bold; letter-spacing: -0.3px; line-height: 1.15; }
    .header-sub { font-size: 11.5px; opacity: 0.72; margin-top: 4px; }
    .header-pill { display: inline-block; margin-top: 14px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.28); padding: 5px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; letter-spacing: 0.2px; }
    .header-strip { height: 5px; background: #fbbf24; }

    /* ── Body ───────────────────────────────────────────── */
    .body { padding: 28px 36px; }

    /* ── Stat cards ─────────────────────────────────────── */
    .stats-row { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 26px; }
    .stat-card { border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 14px 10px; text-align: center; background: #f9fafb; vertical-align: middle; }
    .stat-card-hi { border-color: #fde68a; background: #fffbeb; }
    .stat-val { font-size: 24px; font-weight: bold; line-height: 1.1; color: #7c2d12; }
    .stat-val-green  { color: #15803d; }
    .stat-val-red    { color: #b91c1c; }
    .stat-val-amber  { color: #92400e; }
    .stat-val-slate  { color: #475569; }
    .stat-lbl { font-size: 8.5px; color: #6b7280; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; }

    /* ── Notice bar ─────────────────────────────────────── */
    .notice { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px; font-size: 10.5px; color: #15803d; font-weight: 600; }

    /* ── Section ────────────────────────────────────────── */
    .section-head { margin-bottom: 12px; padding-bottom: 9px; border-bottom: 2px solid #f3f4f6; }
    .section-title-wrap { display: table; width: 100%; }
    .section-bar { display: table-cell; width: 4px; background: #7c2d12; border-radius: 2px; height: 17px; vertical-align: middle; }
    .section-title { display: table-cell; vertical-align: middle; padding-left: 9px; font-size: 11px; font-weight: bold; color: #111827; text-transform: uppercase; letter-spacing: 0.8px; }
    .section-count { display: table-cell; vertical-align: middle; text-align: right; font-size: 9px; color: #9ca3af; font-weight: 600; }
    section { margin-bottom: 26px; }

    /* ── Table ──────────────────────────────────────────── */
    table.data { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.data thead tr { background: #1f2937; color: #fff; }
    table.data thead th { padding: 9px 11px; text-align: left; font-weight: 600; font-size: 9.5px; letter-spacing: 0.3px; }
    table.data thead th.center { text-align: center; }
    table.data tbody tr:nth-child(even) { background: #f9fafb; }
    table.data tbody td { padding: 8px 11px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    table.data tbody td.center { text-align: center; }

    /* ── Badges ─────────────────────────────────────────── */
    .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: 9px; font-weight: 700; min-width: 26px; text-align: center; }
    .bg  { background: #dcfce7; color: #15803d; }
    .br  { background: #fee2e2; color: #b91c1c; }
    .ba  { background: #fef3c7; color: #92400e; }
    .bsl { background: #f1f5f9; color: #475569; }
    .lit { display: inline-block; padding: 2px 9px; border-radius: 8px; font-size: 9px; font-weight: 600; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }

    /* ── Medal / rank ───────────────────────────────────── */
    .m1 { color: #ca8a04; font-size: 13px; }
    .m2 { color: #71717a; font-size: 13px; }
    .m3 { color: #b45309; font-size: 13px; }
    .rn { color: #9ca3af; font-weight: 600; font-size: 10px; }

    /* ── Progress bar ───────────────────────────────────── */
    .pb-wrap { background: #e5e7eb; border-radius: 4px; height: 6px; width: 62px; display: inline-block; vertical-align: middle; overflow: hidden; }
    .pb-fill  { height: 6px; border-radius: 4px; }
    .pb-g { background: #16a34a; }
    .pb-a { background: #d97706; }
    .pb-r { background: #dc2626; }
    .pb-txt { font-size: 10px; font-weight: 700; margin-left: 6px; vertical-align: middle; }
    .pt-g { color: #15803d; }
    .pt-a { color: #92400e; }
    .pt-r { color: #b91c1c; }

    /* ── Celebration table ──────────────────────────────── */
    .day-name { color: #6b7280; font-size: 10px; }
    .time-val  { font-weight: 600; color: #374151; }

    /* ── Footer ─────────────────────────────────────────── */
    .footer { margin-top: 32px; padding: 13px 36px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer-inner { width: 100%; border-collapse: collapse; }
    .footer-brand { font-size: 9px; font-weight: 700; color: #6b7280; }
    .footer-date  { font-size: 9px; color: #9ca3af; text-align: right; }
  </style>
</head>
<body>

{{-- ── Header ────────────────────────────────────────── --}}
<div class="header">
  <div class="header-blob1"></div>
  <div class="header-blob2"></div>
  <div class="header-eyebrow">Sistema de Gestão Litúrgica</div>
  <h1>Ministério dos Acólitos</h1>
  <div class="header-sub">Relatório Mensal de Atividades</div>
  <div class="header-pill">{{ ucfirst($label) }}</div>
</div>
<div class="header-strip"></div>

<div class="body">

  {{-- ── Stats ──────────────────────────────────────────── --}}
  <table class="stats-row">
    <tr>
      <td class="stat-card stat-card-hi" style="width:17%">
        <div class="stat-val">{{ $total_cel }}</div>
        <div class="stat-lbl">Celebrações</div>
      </td>
      <td class="stat-card" style="width:17%">
        <div class="stat-val stat-val-green">{{ $serviu }}</div>
        <div class="stat-lbl">Serviram</div>
      </td>
      <td class="stat-card" style="width:17%">
        <div class="stat-val stat-val-red">{{ $faltou }}</div>
        <div class="stat-lbl">Ausências</div>
      </td>
      <td class="stat-card" style="width:17%">
        <div class="stat-val stat-val-amber">{{ $substituido }}</div>
        <div class="stat-lbl">Substituídos</div>
      </td>
      <td class="stat-card" style="width:15%">
        <div class="stat-val stat-val-slate">{{ $justificado }}</div>
        <div class="stat-lbl">Justificados</div>
      </td>
      <td class="stat-card stat-card-hi" style="width:17%">
        <div class="stat-val">{{ $pres_media }}%</div>
        <div class="stat-lbl">Presença média</div>
      </td>
    </tr>
  </table>

  @if($novos_acolitos > 0)
  <div class="notice">
    {{ $novos_acolitos }} novo{{ $novos_acolitos > 1 ? 's' : '' }} acólito{{ $novos_acolitos > 1 ? 's' : '' }} cadastrado{{ $novos_acolitos > 1 ? 's' : '' }} em {{ ucfirst($label) }}
  </div>
  @endif

  {{-- ── Ranking ──────────────────────────────────────────── --}}
  @if($ranking->count())
  <section>
    <div class="section-head">
      <table class="section-title-wrap">
        <tr>
          <td style="width:4px; background:#7c2d12; border-radius:2px; height:17px; vertical-align:middle;">&nbsp;</td>
          <td style="padding-left:9px; vertical-align:middle; font-size:11px; font-weight:bold; color:#111827; text-transform:uppercase; letter-spacing:0.8px;">Ranking de Assiduidade</td>
          <td style="text-align:right; vertical-align:middle; font-size:9px; color:#9ca3af; font-weight:600;">{{ $ranking->count() }} acólito{{ $ranking->count() > 1 ? 's' : '' }}</td>
        </tr>
      </table>
    </div>
    <table class="data">
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Acólito</th>
          <th class="center" style="width:54px">Serviu</th>
          <th class="center" style="width:54px">Faltou</th>
          <th class="center" style="width:54px">Subst.</th>
          <th class="center" style="width:54px">Justif.</th>
          <th style="width:120px">Frequência</th>
        </tr>
      </thead>
      <tbody>
        @foreach($ranking as $i => $r)
        @php
          $total   = $r->presente + $r->ausente;
          $pct     = $total > 0 ? round(($r->presente / $total) * 100) : 0;
          $cls     = $pct >= 80 ? 'g' : ($pct >= 60 ? 'a' : 'r');
          $pctPx   = round($pct * 62 / 100);
        @endphp
        <tr>
          <td>
            @if($i === 0)<span class="m1">🥇</span>
            @elseif($i === 1)<span class="m2">🥈</span>
            @elseif($i === 2)<span class="m3">🥉</span>
            @else<span class="rn">{{ $i + 1 }}</span>@endif
          </td>
          <td style="font-weight:500">{{ $r->nome }}</td>
          <td class="center"><span class="badge bg">{{ $r->presente }}</span></td>
          <td class="center"><span class="badge br">{{ $r->ausente }}</span></td>
          <td class="center"><span class="badge ba">{{ $r->substituido ?? 0 }}</span></td>
          <td class="center"><span class="badge bsl">{{ $r->justificado ?? 0 }}</span></td>
          <td>
            <span class="pb-wrap"><span class="pb-fill pb-{{ $cls }}" style="width:{{ $pctPx }}px"></span></span>
            <span class="pb-txt pt-{{ $cls }}">{{ $pct }}%</span>
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </section>
  @endif

  {{-- ── Celebrações ──────────────────────────────────────── --}}
  @if($celebracoes->count())
  <section>
    <div class="section-head">
      <table class="section-title-wrap">
        <tr>
          <td style="width:4px; background:#7c2d12; border-radius:2px; height:17px; vertical-align:middle;">&nbsp;</td>
                    <td style="width:4px; background:#7c2d12; border-radius:2px; height:17px; vertical-align:middle;">&nbsp;</td>
          <td style="width:4px; background:#7c2d12; border-radius:2px; height:17px; vertical-align:middle;">&nbsp;</td>

          <td style="padding-left:9px; vertical-align:middle; font-size:11px; font-weight:bold; color:#111827; text-transform:uppercase; letter-spacing:0.8px;">Celebrações Realizadas</td>
          <td style="text-align:right; vertical-align:middle; font-size:9px; color:#9ca3af; font-weight:600;">{{ $celebracoes->count() }} celebraç{{ $celebracoes->count() > 1 ? 'ões' : 'ão' }}</td>
        </tr>
      </table>
    </div>
    <table class="data">
      <thead>
        <tr>
          <th style="width:80px">Data</th>
          <th style="width:100px">Dia da Semana</th>
          <th style="width:60px">Horário</th>
          <th>Período Litúrgico</th>
        </tr>
      </thead>
      <tbody>
        @foreach($celebracoes as $c)
        @php $dt = \Carbon\Carbon::parse($c->data); @endphp
        <tr>
          <td style="font-weight:600">{{ $dt->format('d/m/Y') }}</td>
          <td class="day-name">{{ ucfirst($dt->locale('pt_BR')->isoFormat('dddd')) }}</td>
          <td class="time-val">{{ substr($c->horario, 0, 5) }}</td>
          <td><span class="lit">{{ \App\Support\PeriodoLiturgico::comNumero($c->periodo_liturgico, $c->data) }}</span></td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </section>
  @endif

</div>

{{-- ── Footer ────────────────────────────────────────── --}}
<div class="footer">
  <table class="footer-inner">
    <tr>
      <td class="footer-brand">Ministério dos Acólitos · Sistema de Gestão Litúrgica</td>
      <td class="footer-date">Gerado em {{ $gerado_em }}</td>
    </tr>
  </table>
</div>

</body>
</html>

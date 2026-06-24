<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 8mm; }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body { font-family: 'DejaVu Sans', sans-serif; background: #fff; color: #1a0a0f; }

  /* Borda dupla: div externo (vermelho) + div interno (dourado) */
  .border-outer {
    border: 4px double #8B0020;
    padding: 4px;
  }
  .border-inner {
    border: 1px solid #c9a84c;
    padding: 10mm 22mm 8mm;
    text-align: center;
  }

  /* ─── Header ─── */
  .paroquia {
    font-size: 9pt;
    color: #8B0020;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-weight: bold;
  }
  .titulo {
    font-size: 30pt;
    color: #8B0020;
    font-weight: bold;
    margin-top: 2mm;
    line-height: 1.1;
  }
  .titulo .cruz { font-size: 22pt; color: #c9a84c; }
  .ministerio-label {
    font-size: 9pt;
    color: #777;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 2mm;
  }

  /* ─── Divisor ─── */
  .divider {
    margin: 6mm auto;
    color: #c9a84c;
    font-size: 13pt;
    letter-spacing: 10px;
  }

  /* ─── Corpo ─── */
  .certifica-texto {
    font-size: 10pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 3mm;
  }
  .nome {
    font-size: 26pt;
    color: #8B0020;
    font-weight: bold;
    border-bottom: 2px solid #c9a84c;
    display: inline-block;
    padding: 0 24px 2px;
    margin-bottom: 4mm;
  }
  .nivel-texto {
    font-size: 10pt;
    color: #666;
    margin-bottom: 3mm;
  }
  .nivel-badge {
    display: inline-block;
    background: #8B0020;
    color: #fff;
    padding: 5px 22px;
    border-radius: 3px;
    font-size: 13pt;
    font-weight: bold;
    letter-spacing: 1px;
  }
  .nivel-descricao {
    font-size: 9pt;
    color: #888;
    font-style: italic;
    margin-top: 3mm;
  }

  /* ─── Stats (tabela) ─── */
  .stats-wrap { margin: 6mm auto; width: 62%; }
  .stats-wrap table { width: 100%; border-collapse: collapse; }
  .stats-wrap td {
    text-align: center;
    padding: 0 12px;
    border-right: 1px solid #dbb96a;
  }
  .stats-wrap td:last-child { border-right: none; }
  .stat-num { font-size: 20pt; color: #8B0020; font-weight: bold; display: block; }
  .stat-lbl { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 1mm; }

  /* ─── Footer (tabela) ─── */
  .footer-wrap { margin-top: 5mm; }
  .footer-wrap table { width: 100%; border-collapse: collapse; }
  .footer-wrap td { vertical-align: bottom; padding: 0; }
  .footer-date { font-size: 9pt; color: #888; text-align: left; }
  .footer-sign { text-align: center; }
  .sign-cruz { font-size: 16pt; color: #c9a84c; display: block; margin-bottom: 2mm; }
  .sign-line { width: 130px; border-top: 1px solid #444; margin: 0 auto 2mm; }
  .sign-label { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .footer-num { font-size: 8pt; color: #bbb; text-align: right; }
</style>
</head>
<body>
<div class="border-outer">
  <div class="border-inner">

    <div class="paroquia">{{ $paroquia }}</div>
    <div class="titulo"><span class="cruz">&#10013;</span> Certificado de Formação</div>
    <div class="ministerio-label">Ministério dos Acólitos</div>

    <div class="divider">&#10022; &nbsp; &#10022; &nbsp; &#10022;</div>

    <div class="certifica-texto">Certificamos que o cerimoniário</div>
    <div class="nome">{{ $cerimoniario->nome }}</div>
    <div class="nivel-texto">concluiu com êxito o nível</div>
    <div class="nivel-badge">{{ $nivel->nome }}</div>
    @if($nivel->descricao)
    <div class="nivel-descricao">{{ $nivel->descricao }}</div>
    @endif

    <div class="stats-wrap">
      <table>
        <tr>
          <td>
            <span class="stat-num">{{ $concluidas }}</span>
            <span class="stat-lbl">Competências concluídas</span>
          </td>
          <td>
            <span class="stat-num">{{ $total }}</span>
            <span class="stat-lbl">Total de competências</span>
          </td>
          <td>
            <span class="stat-num">{{ $pct }}%</span>
            <span class="stat-lbl">Aproveitamento</span>
          </td>
        </tr>
      </table>
    </div>

    <div class="divider">&#10022; &nbsp; &#10022; &nbsp; &#10022;</div>

    <div class="footer-wrap">
      <table>
        <tr>
          <td class="footer-date">{{ $hoje }}</td>
          <td class="footer-sign">
            <span class="sign-cruz">&#10013;</span>
            <div class="sign-line"></div>
            <div class="sign-label">Coordenação do Ministério</div>
          </td>
          <td class="footer-num">Nº {{ $cerimoniario->numero ?? '—' }}</td>
        </tr>
      </table>
    </div>

  </div>
</div>
</body>
</html>

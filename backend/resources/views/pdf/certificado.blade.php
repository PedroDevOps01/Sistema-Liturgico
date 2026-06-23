<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; background:#fff; color:#1a0a0f; }
  .page { width:100%; height:100%; padding:40px 60px; border:8px double #8B0020; min-height:540px; }
  .header { text-align:center; margin-bottom:30px; }
  .header .ministerio { font-size:13px; color:#8B0020; letter-spacing:3px; text-transform:uppercase; font-weight:bold; }
  .header h1 { font-size:38px; color:#8B0020; margin:8px 0 4px; font-weight:bold; letter-spacing:1px; }
  .header .subtitle { font-size:13px; color:#555; letter-spacing:2px; text-transform:uppercase; }
  .divider { height:2px; background:linear-gradient(to right, transparent, #8B0020, transparent); margin:20px auto; width:60%; }
  .body-text { text-align:center; font-size:14px; color:#333; line-height:1.8; margin:20px 0; }
  .nome { font-size:28px; color:#8B0020; font-weight:bold; margin:10px 0; border-bottom:2px solid #d4a017; display:inline-block; padding:0 20px 4px; }
  .nivel-box { display:inline-block; background:#8B0020; color:#fff; padding:8px 24px; border-radius:4px; font-size:16px; font-weight:bold; margin:10px 0; letter-spacing:1px; }
  .stats { display:flex; justify-content:center; gap:40px; margin:20px 0; }
  .stat { text-align:center; }
  .stat .num { font-size:24px; color:#8B0020; font-weight:bold; }
  .stat .lbl { font-size:11px; color:#666; text-transform:uppercase; letter-spacing:1px; }
  .footer { margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end; }
  .footer .date { font-size:12px; color:#666; }
  .footer .sign { text-align:center; }
  .footer .sign .line { width:180px; border-top:1px solid #333; margin:0 auto 4px; }
  .footer .sign .label { font-size:11px; color:#666; }
  .cross { font-size:28px; color:#d4a017; margin-bottom:4px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="ministerio">{{ $paroquia }}</div>
    <h1>&#10013; Certificado de Formação</h1>
    <div class="subtitle">Ministério dos Acólitos</div>
  </div>
  <div class="divider"></div>
  <div class="body-text">
    <p>Certificamos que o cerimoniário</p>
    <div class="nome">{{ $cerimoniario->nome }}</div>
    <p style="margin-top:12px;">concluiu com êxito o nível</p>
    <div class="nivel-box">{{ $nivel->nome }}</div>
    @if($nivel->descricao)
    <p style="margin-top:8px;font-size:12px;color:#666;">{{ $nivel->descricao }}</p>
    @endif
  </div>
  <div class="stats">
    <div class="stat"><div class="num">{{ $concluidas }}</div><div class="lbl">Competências concluídas</div></div>
    <div class="stat"><div class="num">{{ $total }}</div><div class="lbl">Total de competências</div></div>
    <div class="stat"><div class="num">{{ $pct }}%</div><div class="lbl">Aproveitamento</div></div>
  </div>
  <div class="divider"></div>
  <div class="footer">
    <div class="date">{{ $hoje }}</div>
    <div class="sign">
      <div class="cross">&#10013;</div>
      <div class="line"></div>
      <div class="label">Coordenação do Ministério</div>
    </div>
    <div style="font-size:11px;color:#999;">Nº {{ $cerimoniario->numero ?? '—' }}</div>
  </div>
</div>
</body>
</html>

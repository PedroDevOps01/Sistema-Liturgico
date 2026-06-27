import { useState } from 'react'
import { Copy, Check, BarChart2, ClipboardList, BookOpen } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { RelatorioReunioesData } from '../types'
import PageHeader from '../components/common/PageHeader'
import CalcNote from '../components/common/CalcNote'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateBR(iso: string) {
  try {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  } catch { return iso }
}

function taxaColorClass(taxa: number | null): string {
  if (taxa === null) return 'text-gray-500 bg-gray-50'
  if (taxa >= 80) return 'text-green-700 bg-green-50'
  if (taxa >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

const TIPO_LABELS: Record<string, string> = {
  ordinaria:      'Ordinária',
  extraordinaria: 'Extraordinária',
  planejamento:   'Planejamento',
  outra:          'Outra',
  formacao:       'Formação',
}

// ─── ReuniaoTable ────────────────────────────────────────────────────────────

type ReuniaoRow = RelatorioReunioesData['por_reuniao_do_mes'][number]

function ReuniaoTable({ rows, emptyText }: { rows: ReuniaoRow[]; emptyText: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Data</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Tema</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Tipo</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Conv.</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Pres.</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Aus.</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Taxa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">{emptyText}</td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDateBR(r.data)}</td>
                  <td className="px-5 py-3 text-gray-800 font-medium">{r.tema}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{TIPO_LABELS[r.tipo] ?? r.tipo}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{r.total_convocados}</td>
                  <td className="px-5 py-3 text-right text-green-700 font-semibold">{r.presentes}</td>
                  <td className="px-5 py-3 text-right text-red-600 font-semibold">{r.ausentes}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${taxaColorClass(r.taxa_presenca_pct)}`}>
                      {r.taxa_presenca_pct !== null ? `${r.taxa_presenca_pct}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RelatorioReunioes() {
  const today = new Date()
  const defaultDe  = format(subMonths(today, 11), 'yyyy-MM-01')
  const defaultAte = format(today, 'yyyy-MM-dd')

  const [de, setDe] = useState(defaultDe)
  const [ate, setAte] = useState(defaultAte)
  const [relatorio, setRelatorio] = useState<RelatorioReunioesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'reunioes' | 'cerimoniarios'>('reunioes')
  const [copied, setCopied] = useState(false)

  async function gerar() {
    setLoading(true)
    try {
      const r = await api.get<RelatorioReunioesData>(`/relatorios/reunioes?de=${de}&ate=${ate}`)
      setRelatorio(r.data)
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  function gerarTexto(): string {
    if (!relatorio) return ''
    const lines: string[] = [
      `RELATÓRIO DE REUNIÕES`,
      `Período: ${formatDateBR(de)} a ${formatDateBR(ate)}`,
      ``,
      `RESUMO`,
      `Reuniões do mês: ${relatorio.totais.total_do_mes}`,
      `Reuniões de formação: ${relatorio.totais.total_formacao}`,
      `Média de presença: ${relatorio.totais.media_presenca_pct !== null ? `${relatorio.totais.media_presenca_pct}%` : '—'}`,
      ``,
      `REUNIÕES DO MÊS`,
    ]
    relatorio.por_reuniao_do_mes.forEach(r => {
      lines.push(`• ${formatDateBR(r.data)} - ${r.tema}`)
      lines.push(`  Convocados: ${r.total_convocados} | Presentes: ${r.presentes} | Ausentes: ${r.ausentes} | Taxa: ${r.taxa_presenca_pct !== null ? `${r.taxa_presenca_pct}%` : '—'}`)
    })
    lines.push(``, `REUNIÕES DE FORMAÇÃO`)
    relatorio.por_reuniao_formacao.forEach(r => {
      lines.push(`• ${formatDateBR(r.data)} - ${r.tema}`)
      lines.push(`  Convocados: ${r.total_convocados} | Presentes: ${r.presentes} | Ausentes: ${r.ausentes} | Taxa: ${r.taxa_presenca_pct !== null ? `${r.taxa_presenca_pct}%` : '—'}`)
    })
    lines.push(``, `POR CERIMONIÁRIO`)
    relatorio.por_cerimoniario.forEach(c => {
      lines.push(`• ${c.nome}: ${c.presentes}/${c.reunioes_convocado} (${c.taxa_pct !== null ? `${c.taxa_pct}%` : '—'})`)
    })
    return lines.join('\n')
  }

  function copiarTexto() {
    const text = gerarTexto()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Relatório copiado!')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presenças em Reuniões"
        subtitle="Relatório de frequência nas reuniões do ministério"
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">De</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="input-field" />
          </div>
          <button onClick={gerar} disabled={loading} className="btn-primary">
            <BarChart2 size={16} />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-8 w-16 rounded" />
              </div>
            ))}
          </div>
          <div className="card p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded" />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {!loading && relatorio && (
        <div className="space-y-5">
          {/* Summary + Export */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              {[
                { label: 'Reuniões do Mês',      value: relatorio.totais.total_do_mes,      color: 'text-gray-900',   bg: '' },
                { label: 'Reuniões de Formação',  value: relatorio.totais.total_formacao,    color: 'text-green-700',  bg: 'bg-green-50' },
                {
                  label: 'Média de Presença',
                  value: relatorio.totais.media_presenca_pct !== null ? `${relatorio.totais.media_presenca_pct}%` : '—',
                  color: relatorio.totais.media_presenca_pct !== null
                    ? (relatorio.totais.media_presenca_pct >= 80 ? 'text-green-700' : relatorio.totais.media_presenca_pct >= 60 ? 'text-amber-700' : 'text-red-700')
                    : 'text-gray-400',
                  bg: relatorio.totais.media_presenca_pct !== null
                    ? (relatorio.totais.media_presenca_pct >= 80 ? 'bg-green-50' : relatorio.totais.media_presenca_pct >= 60 ? 'bg-amber-50' : 'bg-red-50')
                    : '',
                },
              ].map(s => (
                <div key={s.label} className={`card p-4 ${s.bg}`}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <button onClick={copiarTexto} className="btn-secondary flex items-center gap-2 self-end">
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar Resumo'}
            </button>
          </div>

          {/* Calc note */}
          <CalcNote items={[
            {
              label: 'Taxa de Presença (por reunião)',
              formula: 'Presentes ÷ Total convocados × 100',
              note: 'O denominador inclui todos os convidados, mesmo sem status registrado.',
            },
            {
              label: 'Taxa por Cerimoniário',
              formula: 'Presenças "presente" ÷ Total de convites recebidos × 100',
              note: 'Convites sem status registrado contam no denominador.',
            },
          ]} />

          {/* Toggle tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-xs">
            {(['reunioes', 'cerimoniarios'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  activeTab === tab ? 'bg-white shadow-sm text-wine-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'reunioes' ? 'Por Reunião' : 'Por Cerimoniário'}
              </button>
            ))}
          </div>

          {/* Por Reunião */}
          {activeTab === 'reunioes' && (
            <div className="space-y-4">
              {/* Reunião do Mês */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-wine-700" />
                  <span className="text-sm font-bold text-gray-700">Reunião do Mês</span>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {relatorio.por_reuniao_do_mes.length}
                  </span>
                </div>
                {relatorio.totais.media_do_mes_pct !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${taxaColorClass(relatorio.totais.media_do_mes_pct)}`}>
                    Média: {relatorio.totais.media_do_mes_pct}%
                  </span>
                )}
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <ReuniaoTable rows={relatorio.por_reuniao_do_mes} emptyText="Nenhuma reunião do mês no período" />

              {/* Reuniões de Formação */}
              <div className="flex items-center gap-3 mt-6">
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-green-700" />
                  <span className="text-sm font-bold text-gray-700">Reuniões de Formação</span>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {relatorio.por_reuniao_formacao.length}
                  </span>
                </div>
                {relatorio.totais.media_formacao_pct !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${taxaColorClass(relatorio.totais.media_formacao_pct)}`}>
                    Média: {relatorio.totais.media_formacao_pct}%
                  </span>
                )}
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <ReuniaoTable rows={relatorio.por_reuniao_formacao} emptyText="Nenhuma reunião de formação no período" />
            </div>
          )}

          {/* Por Cerimoniário */}
          {activeTab === 'cerimoniarios' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Cerimoniário</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Convocado</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Presente</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Ausente</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Justificado</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relatorio.por_cerimoniario.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">Nenhum dado no período</td>
                      </tr>
                    ) : (
                      relatorio.por_cerimoniario
                        .sort((a, b) => (b.taxa_pct ?? -1) - (a.taxa_pct ?? -1))
                        .map(c => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900">{c.nome}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{c.reunioes_convocado}</td>
                            <td className="px-5 py-3 text-right text-green-700 font-semibold">{c.presentes}</td>
                            <td className="px-5 py-3 text-right text-red-600">{c.ausentes}</td>
                            <td className="px-5 py-3 text-right text-amber-700">{c.justificados}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${taxaColorClass(c.taxa_pct)}`}>
                                {c.taxa_pct !== null ? `${c.taxa_pct}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !relatorio && (
        <div className="card p-16 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Defina o período e gere o relatório</p>
          <p className="text-sm text-gray-400 mt-1">Os dados de presença nas reuniões serão exibidos aqui.</p>
        </div>
      )}
    </div>
  )
}

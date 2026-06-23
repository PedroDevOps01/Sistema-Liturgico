import { useEffect, useState } from 'react'
import { TrendingUp, Users, BarChart2 } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { RelatorioCrescimentoData } from '../types'
import PageHeader from '../components/common/PageHeader'

// ─── Main component ──────────────────────────────────────────────────────────

export default function RelatorioCrescimento() {
  const today = new Date()
  const defaultDe = format(subMonths(today, 11), 'yyyy-MM-01')
  const defaultAte = format(today, 'yyyy-MM-dd')

  const [de, setDe] = useState(defaultDe)
  const [ate, setAte] = useState(defaultAte)
  const [relatorio, setRelatorio] = useState<RelatorioCrescimentoData | null>(null)
  const [loading, setLoading] = useState(false)

  async function gerar() {
    setLoading(true)
    try {
      const r = await api.get<RelatorioCrescimentoData>(`/relatorios/crescimento?de=${de}&ate=${ate}`)
      setRelatorio(r.data)
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate on mount with defaults
  useEffect(() => { gerar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const maxNovos = relatorio
    ? Math.max(...relatorio.por_mes.map(m => m.novos_cerimoniarios), 1)
    : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crescimento do Ministério"
        subtitle="Evolução de membros ao longo do tempo"
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-8 w-16 rounded" />
              </div>
            ))}
          </div>
          <div className="card p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded" />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {!loading && relatorio && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Ativos', value: relatorio.resumo.total_ativos, color: 'text-green-700', bg: 'bg-green-50', icon: <Users size={20} className="text-green-600" /> },
              { label: 'Total de Membros', value: relatorio.resumo.total_geral, color: 'text-gray-900', bg: '', icon: <Users size={20} className="text-gray-400" /> },
              { label: 'Novos no Período', value: relatorio.resumo.novos_no_periodo, color: 'text-wine-900', bg: 'bg-wine-50', icon: <TrendingUp size={20} className="text-wine-700" /> },
              { label: 'Interessados', value: relatorio.resumo.interessados_no_periodo, color: 'text-blue-700', bg: 'bg-blue-50', icon: <Users size={20} className="text-blue-600" /> },
            ].map(s => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                  {s.icon}
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Vertical bar chart */}
          {relatorio.por_mes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-5">Novos membros por mês</h3>
              <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
                {relatorio.por_mes.map(m => {
                  const heightPct = maxNovos > 0 ? (m.novos_cerimoniarios / maxNovos) * 100 : 0
                  const barHeight = Math.max(heightPct * 1.2, m.novos_cerimoniarios > 0 ? 8 : 2)
                  return (
                    <div
                      key={m.mes}
                      className="flex flex-col items-center gap-1 flex-1 min-w-[40px]"
                    >
                      {m.novos_cerimoniarios > 0 && (
                        <span className="text-xs font-bold text-wine-900">{m.novos_cerimoniarios}</span>
                      )}
                      <div className="w-full flex flex-col justify-end" style={{ height: 120 }}>
                        <div
                          className="w-full rounded-t-md bg-wine-700 transition-all duration-700 relative group"
                          style={{ height: `${barHeight}px`, minHeight: m.novos_cerimoniarios > 0 ? 8 : 2 }}
                          title={`${m.label}: ${m.novos_cerimoniarios} novos`}
                        >
                          {m.interessados > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-blue-400 opacity-60 rounded-t-md"
                              style={{ height: `${Math.min((m.interessados / maxNovos) * 120, barHeight)}px` }}
                              title={`${m.interessados} interessados`}
                            />
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 text-center leading-tight" style={{ fontSize: '0.65rem' }}>
                        {m.label.slice(0, 3)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-wine-700 inline-block" />Cerimoniários</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Interessados</span>
              </div>
            </div>
          )}

          {/* Growth table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Detalhamento por Mês</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Mês</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Novos Cerimoniários</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Interessados</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Total Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatorio.por_mes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400">Nenhum dado no período</td>
                    </tr>
                  ) : (
                    relatorio.por_mes.map(m => (
                      <tr key={m.mes} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{m.label}</td>
                        <td className="px-5 py-3 text-right">
                          {m.novos_cerimoniarios > 0 ? (
                            <span className="text-wine-800 font-semibold">+{m.novos_cerimoniarios}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-blue-700">
                          {m.interessados > 0 ? m.interessados : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{m.acumulado_cerimoniarios}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty / initial ───────────────────────────────────────────────── */}
      {!loading && !relatorio && (
        <div className="card p-16 text-center">
          <TrendingUp size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Clique em "Gerar Relatório" para ver os dados</p>
        </div>
      )}
    </div>
  )
}

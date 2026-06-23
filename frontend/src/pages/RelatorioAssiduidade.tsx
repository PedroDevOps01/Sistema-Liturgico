import { useEffect, useState } from 'react'
import { format, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { getPeriodoBadgeVariant } from '../lib/liturgico'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssiduidadePorPeriodo {
  periodo_liturgico: string
  total_escalados: number
  serviu: number
  faltou: number
  justificado: number
  substituido: number
  taxa_pct: number | null
}

interface TopAusente {
  id: number
  nome: string
  total_faltas: number
}

interface AusentesMes {
  mes: string
  label: string
  itens: { id: number; nome: string; faltas: number }[]
}

interface RelatorioAssiduidadeData {
  periodo: { inicio: string; fim: string }
  por_periodo: AssiduidadePorPeriodo[]
  top_ausentes: TopAusente[]
  ausentes_por_mes: AusentesMes[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function taxaColor(taxa: number | null) {
  if (taxa === null) return 'text-gray-400'
  if (taxa >= 80) return 'text-green-700'
  if (taxa >= 60) return 'text-amber-700'
  return 'text-red-700'
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RelatorioAssiduidade() {
  const today = new Date()
  const [de, setDe] = useState(format(startOfYear(today), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(today, 'yyyy-MM-dd'))
  const [relatorio, setRelatorio] = useState<RelatorioAssiduidadeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedMeses, setExpandedMeses] = useState<Set<string>>(new Set())

  async function carregar() {
    setLoading(true)
    try {
      const r = await api.get<RelatorioAssiduidadeData>(`/relatorios/assiduidade?de=${de}&ate=${ate}`)
      setRelatorio(r.data)
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMes(mes: string) {
    setExpandedMeses(prev => {
      const next = new Set(prev)
      if (next.has(mes)) next.delete(mes)
      else next.add(mes)
      return next
    })
  }

  const maxFaltas = relatorio
    ? Math.max(...relatorio.top_ausentes.map(a => a.total_faltas), 1)
    : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assiduidade por Período Litúrgico"
        subtitle="Análise de presença e ausência dos cerimoniários por período litúrgico"
      />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">De</label>
            <input
              type="date"
              value={de}
              onChange={e => setDe(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Até</label>
            <input
              type="date"
              value={ate}
              onChange={e => setAte(e.target.value)}
              className="input-field"
            />
          </div>
          <button onClick={carregar} disabled={loading} className="btn-primary">
            <BarChart2 size={16} />
            {loading ? 'Gerando...' : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
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

          {/* Assiduidade por período litúrgico */}
          {relatorio.por_periodo.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Assiduidade por Período Litúrgico</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Período</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Escalados</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Serviu</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Faltou</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Justificado</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Substituído</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relatorio.por_periodo.map(row => (
                      <tr key={row.periodo_liturgico} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <Badge variant={getPeriodoBadgeVariant(row.periodo_liturgico)} size="sm">
                            {row.periodo_liturgico}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.total_escalados}</td>
                        <td className="px-4 py-3 text-center font-semibold text-green-700 hidden sm:table-cell">{row.serviu}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-600 hidden sm:table-cell">{row.faltou}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600 hidden md:table-cell">{row.justificado}</td>
                        <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">{row.substituido}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${taxaColor(row.taxa_pct)}`}>
                            {row.taxa_pct !== null ? `${row.taxa_pct}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top ausentes — horizontal bar chart */}
          {relatorio.top_ausentes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cerimoniários com Mais Faltas</h3>
              <div className="space-y-3">
                {relatorio.top_ausentes.map(a => {
                  const pct = maxFaltas > 0 ? (a.total_faltas / maxFaltas) * 100 : 0
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-36 truncate flex-shrink-0">{a.nome}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                        <div
                          className="h-5 rounded-full bg-red-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-red-700 w-8 text-right flex-shrink-0">
                        {a.total_faltas}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ausentes por mês — collapsible */}
          {relatorio.ausentes_por_mes.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Faltas por Mês</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {relatorio.ausentes_por_mes.map(mes => {
                  const isOpen = expandedMeses.has(mes.mes)
                  return (
                    <div key={mes.mes}>
                      <button
                        onClick={() => toggleMes(mes.mes)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">{mes.label}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {mes.itens.length} cerimoniário{mes.itens.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronDown size={16} className="text-gray-400" />
                          : <ChevronRight size={16} className="text-gray-400" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {mes.itens.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                            >
                              <span className="text-sm text-gray-800 truncate">{item.nome}</span>
                              <span className="text-xs font-bold text-red-600 ml-2 flex-shrink-0">
                                {item.faltas} {item.faltas === 1 ? 'falta' : 'faltas'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Period info footer */}
          <p className="text-xs text-gray-400 text-center">
            Período analisado:{' '}
            {format(new Date(relatorio.periodo.inicio + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {' '}—{' '}
            {format(new Date(relatorio.periodo.fim + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !relatorio && (
        <div className="card p-16 text-center">
          <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Selecione um período e clique em Aplicar</p>
          <p className="text-sm text-gray-400 mt-1">Os dados de assiduidade serão exibidos aqui.</p>
        </div>
      )}
    </div>
  )
}

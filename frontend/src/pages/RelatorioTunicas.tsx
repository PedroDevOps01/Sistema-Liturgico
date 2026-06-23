import { useEffect, useState } from 'react'
import { format, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart2, Shirt } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RelatorioEmprestimosData {
  periodo: { inicio: string; fim: string }
  totais: { total: number; devolvidas: number; em_aberto: number; perdidas: number }
  tempo_medio_dias: number | null
  top_usuarios: { id: number; nome: string; total_emprestimos: number; perdidas: number }[]
  top_perdidas: { id: number; codigo: string; cor: string; ocorrencias_perda: number }[]
  historico: {
    id: number
    codigo: string
    cor: string
    cerimoniario: string
    data_emprestimo: string
    data_devolucao_real: string | null
    data_devolucao_prevista: string | null
    status: string
  }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateBR(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return format(new Date(iso.substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

function statusBadge(status: string) {
  if (status === 'emprestada') return <Badge variant="blue" size="sm">Emprestada</Badge>
  if (status === 'devolvida')  return <Badge variant="green" size="sm">Devolvida</Badge>
  if (status === 'perdida')    return <Badge variant="red" size="sm">Perdida</Badge>
  return <Badge variant="gray" size="sm">{status}</Badge>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RelatorioTunicas() {
  const today = new Date()
  const [de, setDe] = useState(format(startOfYear(today), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(today, 'yyyy-MM-dd'))
  const [relatorio, setRelatorio] = useState<RelatorioEmprestimosData | null>(null)
  const [loading, setLoading] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const r = await api.get<RelatorioEmprestimosData>(`/relatorios/emprestimos?de=${de}&ate=${ate}`)
      setRelatorio(r.data)
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empréstimos de Túnicas"
        subtitle="Relatório de empréstimos, devoluções e perdas de túnicas por período"
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-8 w-14 rounded" />
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

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total',           value: relatorio.totais.total,       cls: 'text-gray-900',   bg: '' },
              { label: 'Devolvidas',      value: relatorio.totais.devolvidas,  cls: 'text-green-700',  bg: 'bg-green-50' },
              { label: 'Em Aberto',       value: relatorio.totais.em_aberto,   cls: 'text-blue-700',   bg: 'bg-blue-50' },
              { label: 'Perdidas',        value: relatorio.totais.perdidas,    cls: 'text-red-700',    bg: 'bg-red-50' },
              {
                label: 'Devolução Média',
                value: relatorio.tempo_medio_dias !== null
                  ? `${relatorio.tempo_medio_dias} dias`
                  : '—',
                cls: 'text-gray-900',
                bg: '',
              },
            ].map(k => (
              <div key={k.label} className={`card p-4 ${k.bg}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Top usuários */}
          {relatorio.top_usuarios.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Top Cerimoniários — Empréstimos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Nome</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Total</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Perdidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relatorio.top_usuarios.map((u, i) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{u.nome}</td>
                        <td className="px-5 py-3 text-center font-semibold text-gray-700">{u.total_emprestimos}</td>
                        <td className="px-5 py-3 text-center">
                          {u.perdidas > 0
                            ? <span className="font-semibold text-red-600">{u.perdidas}</span>
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top perdidas */}
          {relatorio.top_perdidas.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Túnicas com Mais Perdas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Código</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Cor</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Ocorrências de Perda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relatorio.top_perdidas.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-medium text-gray-900">{t.codigo}</td>
                        <td className="px-5 py-3 capitalize text-gray-600">{t.cor}</td>
                        <td className="px-5 py-3 text-center font-semibold text-red-600">{t.ocorrencias_perda}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Histórico Recente</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Código</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Cor</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Cerimoniário</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Empréstimo</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Devolução</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatorio.historico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    relatorio.historico.map(h => (
                      <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-medium text-gray-900">{h.codigo}</td>
                        <td className="px-5 py-3 capitalize text-gray-600 hidden sm:table-cell">{h.cor}</td>
                        <td className="px-5 py-3 text-gray-800">{h.cerimoniario}</td>
                        <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{formatDateBR(h.data_emprestimo)}</td>
                        <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{formatDateBR(h.data_devolucao_real)}</td>
                        <td className="px-5 py-3">{statusBadge(h.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !relatorio && (
        <div className="card p-16 text-center">
          <Shirt size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Selecione um período e clique em Aplicar</p>
          <p className="text-sm text-gray-400 mt-1">O relatório de empréstimos será exibido aqui.</p>
        </div>
      )}
    </div>
  )
}

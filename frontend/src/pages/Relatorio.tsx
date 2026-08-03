import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  BarChart2, Users, CheckCircle, XCircle,
  AlertCircle, RefreshCw, UserX,
  ChevronRight, Award,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { formatDataShort, formatHorario } from '../lib/dateUtils'
import { formatPeriodoParaExibicao } from '../lib/liturgico'

// ── Types ────────────────────────────────────────────────────────────────────
interface Totais {
  total_escalados: number
  serviu: number
  faltou: number
  substituido: number
  justificado: number
  confirmado: number
  sem_registro: number
}

interface PorCerimoniario {
  id: number
  nome: string
  total: number
  serviu: number
  faltou: number
  substituido: number
  justificado: number
  confirmado: number
  sem_registro: number
}

interface PorCelebracao {
  celebracao_id: number
  data: string
  horario: string
  periodo_liturgico: string
  escala_id: number
  total: number
  serviu: number
  faltou: number
  substituido: number
  justificado: number
  confirmado: number
  sem_registro: number
}

interface Substituicao {
  data: string
  horario: string
  periodo_liturgico: string
  escala_id: number
  cerimoniario_id: number
  cerimoniario_nome: string
  substituto_id: number | null
  substituto_nome: string | null
  funcao: string
}

interface RankingSubstituto {
  id: number
  nome: string
  total_substituicoes: number
}

interface RelatorioData {
  periodo: { inicio: string; fim: string }
  totais: Totais
  por_cerimoniario: PorCerimoniario[]
  por_celebracao: PorCelebracao[]
  top_faltas: PorCerimoniario[]
  top_presenca: PorCerimoniario[]
  substituicoes: Substituicao[]
  ranking_substitutos: RankingSubstituto[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  serviu: 'Serviu', faltou: 'Faltou', substituido: 'Substituído',
  justificado: 'Justificado', confirmado: 'Confirmado', sem_registro: 'Sem registro',
}

const STATUS_CONFIG = {
  serviu:       { colorClass: 'bg-green-500',  textClass: 'text-green-700',  bgClass: 'bg-green-50',  borderClass: 'border-green-200' },
  faltou:       { colorClass: 'bg-red-500',    textClass: 'text-red-700',    bgClass: 'bg-red-50',    borderClass: 'border-red-200'   },
  substituido:  { colorClass: 'bg-amber-500',  textClass: 'text-amber-700',  bgClass: 'bg-amber-50',  borderClass: 'border-amber-200' },
  justificado:  { colorClass: 'bg-blue-500',   textClass: 'text-blue-700',   bgClass: 'bg-blue-50',   borderClass: 'border-blue-200'  },
  confirmado:   { colorClass: 'bg-purple-500', textClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200'},
  sem_registro: { colorClass: 'bg-gray-300',   textClass: 'text-gray-500',   bgClass: 'bg-gray-50',   borderClass: 'border-gray-200'  },
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

// ── Mini bar component ────────────────────────────────────────────────────────
function MiniBar({ value, total, colorClass }: { value: number; total: number; colorClass: string }) {
  const p = pct(value, total)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
             style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{p}%</span>
    </div>
  )
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, total, icon: Icon, colorClass, textClass, bgClass, borderClass }: {
  label: string; value: number; total: number
  icon: React.ElementType; colorClass: string; textClass: string; bgClass: string; borderClass: string
}) {
  return (
    <div className={`card p-4 border ${borderClass}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon size={20} className={textClass} />
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass} ${textClass}`}>
          {pct(value, total)}%
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      <MiniBar value={value} total={total} colorClass={colorClass} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Relatorio() {
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'cerimoniario' | 'celebracao' | 'substituicoes' | 'ranking_substitutos'>('cerimoniario')

  // Date filter
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [fim,    setFim]    = useState(format(endOfMonth(new Date()),   'yyyy-MM-dd'))

  function setPreset(months: number) {
    const ref = months === 0 ? new Date() : subMonths(new Date(), months - 1)
    setInicio(format(startOfMonth(ref), 'yyyy-MM-dd'))
    setFim   (format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  }

  async function load() {
    setLoading(true)
    try {
      const r = await api.get<RelatorioData>(`/relatorios/presencas?data_inicio=${inicio}&data_fim=${fim}`)
      setData(r.data)
    } catch {
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [inicio, fim])

  const t = data?.totais

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório de Presenças"
        subtitle="Acompanhe participação, faltas e substituições"
        action={
          <button onClick={load} className="btn-secondary text-sm px-4 py-2">
            <RefreshCw size={15} /> Atualizar
          </button>
        }
      />

      {/* ── Filters ── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label text-xs">Data início</label>
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                   className="input-field text-sm py-2 w-40" />
          </div>
          <div>
            <label className="label text-xs">Data fim</label>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
                   className="input-field text-sm py-2 w-40" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Este mês', months: 0 },
              { label: 'Últimos 3 meses', months: 3 },
              { label: 'Últimos 6 meses', months: 6 },
            ].map(({ label, months }) => (
              <button key={months} onClick={() => setPreset(months)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-wine-200 text-wine-700 hover:bg-wine-50 transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
        {data && (
          <p className="text-xs text-gray-400 mt-3">
            Período:{' '}
            <strong className="text-gray-600">
              {formatDataShort(data.periodo.inicio)} → {formatDataShort(data.periodo.fim)}
            </strong>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : !t ? null : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card p-4 col-span-2 sm:col-span-3 lg:col-span-1 flex items-center gap-3"
                 style={{ borderLeft: '4px solid rgb(var(--w-700))' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-wine-50">
                <Users size={20} className="text-wine-700" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{t.total_escalados}</div>
                <div className="text-xs text-gray-500">Total escalados</div>
              </div>
            </div>
            <StatCard label="Serviram" value={t.serviu} total={t.total_escalados}
                      icon={CheckCircle} {...STATUS_CONFIG.serviu} />
            <StatCard label="Faltaram" value={t.faltou} total={t.total_escalados}
                      icon={XCircle} {...STATUS_CONFIG.faltou} />
            <StatCard label="Substituídos" value={t.substituido} total={t.total_escalados}
                      icon={RefreshCw} {...STATUS_CONFIG.substituido} />
            <StatCard label="Justificados" value={t.justificado} total={t.total_escalados}
                      icon={AlertCircle} {...STATUS_CONFIG.justificado} />
            <StatCard label="Sem registro" value={t.sem_registro} total={t.total_escalados}
                      icon={UserX} {...STATUS_CONFIG.sem_registro} />
          </div>

          {/* ── Top cards ── */}
          {(data.top_presenca.length > 0 || data.top_faltas.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Top presença */}
              {data.top_presenca.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    Quem mais serviu
                  </h3>
                  <div className="space-y-3">
                    {data.top_presenca.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                             style={{ background: i === 0 ? 'linear-gradient(135deg, var(--theme-btn-to), var(--theme-btn-from))' : '#d1d5db' }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{c.nome}</div>
                          <MiniBar value={c.serviu} total={c.total} colorClass="bg-green-500" />
                        </div>
                        <span className="text-sm font-bold text-green-600 flex-shrink-0">{c.serviu}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top faltas */}
              {data.top_faltas.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <XCircle size={16} className="text-red-600" />
                    Mais ausências
                  </h3>
                  <div className="space-y-3">
                    {data.top_faltas.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-red-400">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{c.nome}</div>
                          <MiniBar value={c.faltou} total={c.total} colorClass="bg-red-500" />
                        </div>
                        <span className="text-sm font-bold text-red-600 flex-shrink-0">{c.faltou}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100">
              {([
                { key: 'cerimoniario',  label: 'Por Cerimoniário', icon: Users },
                { key: 'celebracao',   label: 'Por Celebração',   icon: BarChart2 },
                { key: 'substituicoes', label: 'Substituições',   icon: RefreshCw },
                { key: 'ranking_substitutos', label: 'Ranking de Substitutos', icon: Award },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                          tab === key
                            ? 'text-wine-700 border-wine-600 bg-wine-50/50'
                            : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {/* ── By cerimoniário ── */}
            {tab === 'cerimoniario' && (
              <div className="overflow-x-auto">
                {data.por_cerimoniario.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhum dado de presença no período</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--theme-mid), var(--theme-to))' }} className="text-white">
                        <th className="text-left px-4 py-3 font-semibold">Cerimoniário</th>
                        <th className="text-center px-3 py-3 font-semibold">Escalado</th>
                        <th className="text-center px-3 py-3 font-semibold text-green-200">Serviu</th>
                        <th className="text-center px-3 py-3 font-semibold text-red-200">Faltou</th>
                        <th className="text-center px-3 py-3 font-semibold text-amber-200">Subst.</th>
                        <th className="text-center px-3 py-3 font-semibold text-blue-200">Just.</th>
                        <th className="text-center px-3 py-3 font-semibold text-gray-200">S/Reg</th>
                        <th className="text-left px-4 py-3 font-semibold">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_cerimoniario.map((c, i) => (
                        <tr key={c.id}
                            className={`border-t border-gray-100 hover:bg-wine-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">{c.nome}</td>
                          <td className="text-center px-3 py-3 text-gray-600">{c.total}</td>
                          <td className="text-center px-3 py-3 font-bold text-green-600">{c.serviu}</td>
                          <td className="text-center px-3 py-3 font-bold text-red-500">{c.faltou || '—'}</td>
                          <td className="text-center px-3 py-3 font-bold text-amber-600">{c.substituido || '—'}</td>
                          <td className="text-center px-3 py-3 font-bold text-blue-600">{c.justificado || '—'}</td>
                          <td className="text-center px-3 py-3 text-gray-400">{c.sem_registro || '—'}</td>
                          <td className="px-4 py-3 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-full rounded-full bg-green-500 transition-all"
                                     style={{ width: `${pct(c.serviu, c.total)}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-8 text-right ${
                                pct(c.serviu, c.total) >= 80 ? 'text-green-600' :
                                pct(c.serviu, c.total) >= 50 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {pct(c.serviu, c.total)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── By celebration ── */}
            {tab === 'celebracao' && (
              <div className="overflow-x-auto">
                {data.por_celebracao.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <BarChart2 size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhuma celebração com registros no período</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--theme-mid), var(--theme-to))' }} className="text-white">
                        <th className="text-left px-4 py-3 font-semibold">Celebração</th>
                        <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Período</th>
                        <th className="text-center px-3 py-3 font-semibold">Total</th>
                        <th className="text-center px-3 py-3 font-semibold text-green-200">Serviu</th>
                        <th className="text-center px-3 py-3 font-semibold text-red-200">Faltou</th>
                        <th className="text-center px-3 py-3 font-semibold text-amber-200">Subst.</th>
                        <th className="text-left px-4 py-3 font-semibold">Presença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_celebracao.map((c, i) => (
                        <tr key={`${c.celebracao_id}-${c.escala_id}`}
                            className={`border-t border-gray-100 hover:bg-wine-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{formatDataShort(c.data)}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <ChevronRight size={10} /> {formatHorario(c.horario)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{formatPeriodoParaExibicao(c.periodo_liturgico, c.data)}</td>
                          <td className="text-center px-3 py-3 text-gray-600">{c.total}</td>
                          <td className="text-center px-3 py-3 font-bold text-green-600">{c.serviu}</td>
                          <td className="text-center px-3 py-3 font-bold text-red-500">{c.faltou || '—'}</td>
                          <td className="text-center px-3 py-3 font-bold text-amber-600">{c.substituido || '—'}</td>
                          <td className="px-4 py-3 min-w-[100px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full"
                                     style={{ width: `${pct(c.serviu, c.total)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-500 w-8 text-right">
                                {pct(c.serviu, c.total)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {/* ── Substituições ── */}
            {tab === 'substituicoes' && (
              <div className="overflow-x-auto">
                {(!data.substituicoes || data.substituicoes.length === 0) ? (
                  <div className="py-16 text-center text-gray-400">
                    <RefreshCw size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhuma substituição registrada no período</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--theme-mid), var(--theme-to))' }} className="text-white">
                        <th className="text-left px-4 py-3 font-semibold">Celebração</th>
                        <th className="text-left px-4 py-3 font-semibold">Função</th>
                        <th className="text-left px-4 py-3 font-semibold">Cerimoniário</th>
                        <th className="text-left px-4 py-3 font-semibold">Substituído por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.substituicoes.map((s, i) => (
                        <tr key={i} className={`border-t border-gray-100 hover:bg-wine-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{formatDataShort(s.data)}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{formatHorario(s.horario)} · {formatPeriodoParaExibicao(s.periodo_liturgico, s.data)}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{s.funcao}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{s.cerimoniario_nome}</span>
                          </td>
                          <td className="px-4 py-3">
                            {s.substituto_nome ? (
                              <div className="flex items-center gap-1.5">
                                <RefreshCw size={12} className="text-amber-500 flex-shrink-0" />
                                <span className="font-semibold text-amber-700">{s.substituto_nome}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Não informado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {/* ── Ranking de substitutos ── */}
            {tab === 'ranking_substitutos' && (
              <div className="overflow-x-auto">
                {(!data.ranking_substitutos || data.ranking_substitutos.length === 0) ? (
                  <div className="py-16 text-center text-gray-400">
                    <Award size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhuma substituição registrada no período</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--theme-mid), var(--theme-to))' }} className="text-white">
                        <th className="text-left px-4 py-3 font-semibold">#</th>
                        <th className="text-left px-4 py-3 font-semibold">Cerimoniário</th>
                        <th className="text-center px-3 py-3 font-semibold text-amber-200">Vezes que substituiu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ranking_substitutos.map((r, i) => (
                        <tr key={r.id}
                            className={`border-t border-gray-100 hover:bg-wine-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                 style={{ background: i === 0 ? 'linear-gradient(135deg, var(--theme-btn-to), var(--theme-btn-from))' : '#d1d5db' }}>
                              {i + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{r.nome}</td>
                          <td className="text-center px-3 py-3 font-bold text-amber-600">{r.total_substituicoes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 px-1">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.colorClass}`} />
                {STATUS_LABELS[key]}
              </div>
            ))}
            <span className="text-gray-400 border-l border-gray-200 pl-3 ml-1">
              S/Reg = sem registro de presença ainda
            </span>
          </div>
        </>
      )}
    </div>
  )
}

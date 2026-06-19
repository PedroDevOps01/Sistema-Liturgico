import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Users,
  Activity, Target, BarChart2, Calendar, ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import LoadingSpinner from '../components/common/LoadingSpinner'

/* ── Types ────────────────────────────────────────────── */
interface EvolucaoItem { mes: string; label: string; celebracoes: number; acolitos: number }
interface RankingItem {
  id: number; nome: string; presente: number; ausente: number
  substituido: number; justificado: number; total: number
  pct: number | null; tendencia: 'subindo' | 'caindo' | 'estavel'
}
interface RiscoItem { id: number; nome: string; faltas_consecutivas: number; ultima_data: string | null }
interface FuncaoItem { funcao: string; total: number; acolitos_unicos: number; top_acolito: string | null }
interface Saude {
  score: number; presenca_media: number; taxa_confirmacao: number
  taxa_atividade: number; treinamentos_3m: number
  nivel: 'excelente' | 'bom' | 'atencao' | 'critico'
}
interface Projecao {
  historico: { mes: string; label: string; total: number }[]
  proximo_mes: string; projecao: number; min_recente: number; max_recente: number
}
interface AnalyticsData {
  evolucao: EvolucaoItem[]
  ranking: RankingItem[]
  risco: RiscoItem[]
  funcoes: FuncaoItem[]
  saude: Saude
  projecao: Projecao
}

/* ── Helpers ──────────────────────────────────────────── */
const NIVEL_MAP = {
  excelente: { label: 'Excelente', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: '#10b981' },
  bom:       { label: 'Bom',       bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    bar: '#3b82f6' },
  atencao:   { label: 'Atenção',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   bar: '#f59e0b' },
  critico:   { label: 'Crítico',   bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     bar: '#ef4444' },
}

function TendenciaIcon({ t }: { t: RankingItem['tendencia'] }) {
  if (t === 'subindo') return <TrendingUp size={14} className="text-emerald-500" />
  if (t === 'caindo')  return <TrendingDown size={14} className="text-red-500" />
  return <Minus size={14} className="text-gray-400" />
}

function PctBar({ pct, compact }: { pct: number | null; compact?: boolean }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 60 ? 'text-amber-700' : 'text-red-600'
  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'min-w-[72px]' : 'min-w-[90px] sm:min-w-[100px]'}`}>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={`text-xs font-bold ${textColor} w-8 text-right tabular-nums`}>{pct}%</span>
    </div>
  )
}

export default function Analytics() {
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'evolucao' | 'projecao'>('evolucao')
  const [winW, setWinW]       = useState(() => window.innerWidth)

  useEffect(() => {
    const h = () => setWinW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    document.title = 'Analytics · Ministério dos Acólitos'
    api.get<AnalyticsData>('/analytics')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDownload(year: number, month: number) {
    api.get(`/relatorio/mensal/${year}/${month}`, { responseType: 'blob' })
      .then(r => {
        const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
        const a   = document.createElement('a')
        a.href    = url
        a.download = `relatorio-${year}-${String(month).padStart(2, '0')}.pdf`
        document.body.appendChild(a); a.click(); a.remove()
        window.URL.revokeObjectURL(url)
      }).catch(() => {})
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>
  )
  if (!data)   return (
    <div className="card p-12 text-center text-gray-400">Erro ao carregar analytics.</div>
  )

  const { saude, evolucao, ranking, risco, funcoes, projecao } = data
  const nivel = NIVEL_MAP[saude.nivel]
  const now = new Date()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Visão aprofundada do desempenho e saúde do ministério"
        action={
          <button
            onClick={() => handleDownload(now.getFullYear(), now.getMonth() === 0 ? 12 : now.getMonth())}
            className="btn-secondary text-sm"
          >
            <Calendar size={15} />
            Relatório do mês anterior
          </button>
        }
      />

      {/* ── Saúde do ministério ─────────────────────────── */}
      <div className={`card p-5 sm:p-6 border-2 ${nivel.border} ${nivel.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 80 80" className="w-20 h-20">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                <circle cx="40" cy="40" r="32" fill="none" stroke={nivel.bar} strokeWidth="7"
                  strokeDasharray={`${(saude.score / 100) * 201} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-extrabold text-gray-900">{saude.score}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Saúde do Ministério</p>
              <p className={`text-xl font-bold ${nivel.text}`}>{nivel.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">Score calculado com presença, confirmações e atividade</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Presença média', val: `${saude.presenca_media}%` },
              { label: 'Taxa confirmação', val: `${saude.taxa_confirmacao}%` },
              { label: 'Acólitos ativos', val: `${saude.taxa_atividade}%` },
              { label: 'Treinamentos 3m', val: String(saude.treinamentos_3m) },
            ].map(s => (
              <div key={s.label} className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{s.val}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Evolução + Projeção ─────────────────────────── */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-wine-700" /> Evolução & Projeção
          </h2>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['evolucao', 'projecao'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === t ? 'bg-white shadow text-wine-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'evolucao' ? 'Últimos 12 meses' : 'Projeção próximo mês'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'evolucao' ? (
          <div className="space-y-4">
            {(() => {
              const isMobile = winW < 640
              const fSize = isMobile ? 9 : 10
              const xFmt = isMobile
                ? (v: string) => v.slice(0, 3)
                : (v: string) => v
              return (
                <>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Celebrações por mês</p>
                    <ResponsiveContainer width="100%" height={isMobile ? 150 : 180}>
                      <LineChart data={evolucao} margin={{ top: 5, right: 8, left: isMobile ? -28 : -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: fSize }} tickFormatter={xFmt} />
                        <YAxis tick={{ fontSize: fSize }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <Line type="monotone" dataKey="celebracoes" stroke="#9a3412" strokeWidth={2.5} dot={{ r: isMobile ? 2 : 3, fill: '#9a3412' }} name="Celebrações" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Acólitos cadastrados (acumulado)</p>
                    <ResponsiveContainer width="100%" height={isMobile ? 110 : 140}>
                      <LineChart data={evolucao} margin={{ top: 5, right: 8, left: isMobile ? -28 : -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: fSize }} tickFormatter={xFmt} />
                        <YAxis tick={{ fontSize: fSize }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <Line type="monotone" dataKey="acolitos" stroke="#d97706" strokeWidth={2.5} dot={{ r: isMobile ? 2 : 3, fill: '#d97706' }} name="Acólitos" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 bg-wine-50 border border-wine-200 rounded-2xl p-4 text-center">
                <p className="text-3xl font-extrabold text-wine-900">{projecao.projecao}</p>
                <p className="text-xs text-wine-600 mt-1 font-medium">Celebrações projetadas</p>
                <p className="text-xs text-gray-400 mt-0.5">{projecao.proximo_mes}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1 text-center text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-bold text-gray-900">{projecao.min_recente}</p>
                  <p className="text-xs text-gray-400">Mín. últimos 3m</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-bold text-gray-900">{projecao.max_recente}</p>
                  <p className="text-xs text-gray-400">Máx. últimos 3m</p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={winW < 640 ? 160 : 200}>
              <BarChart data={projecao.historico.concat([{ mes: 'proj', label: 'Projeção', total: projecao.projecao }])}
                margin={{ top: 5, right: 8, left: winW < 640 ? -28 : -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: winW < 640 ? 9 : 10 }}
                  tickFormatter={(v: string) => winW < 640 ? v.slice(0, 3) : v} />
                <YAxis tick={{ fontSize: winW < 640 ? 9 : 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <ReferenceLine x="Projeção" stroke="#9a3412" strokeDasharray="4 2" />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Celebrações">
                  {projecao.historico.map((_, i) => (
                    <Cell key={i} fill="#c2410c" opacity={0.7} />
                  ))}
                  <Cell fill="#9a3412" opacity={1} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Ranking de assiduidade ─────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Award size={18} className="text-wine-700" /> Ranking de Assiduidade
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados de presença ainda.</p>
          ) : (
            <>
              {/* ── Mobile: lista compacta ──────────────────── */}
              <div className="sm:hidden divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {ranking.map((r, i) => (
                  <a key={r.id} href={`/cerimoniarios/${r.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors rounded-lg px-1 -mx-1">
                    <span className="w-7 text-center font-bold text-gray-400 text-sm flex-shrink-0 leading-none">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{r.presente}✓</span>
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{r.ausente}✗</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PctBar pct={r.pct} compact />
                      <TendenciaIcon t={r.tendencia} />
                    </div>
                  </a>
                ))}
              </div>

              {/* ── Desktop: tabela completa ────────────────── */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="overflow-y-auto max-h-[420px]">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold">
                        <th className="pb-2 text-left">#</th>
                        <th className="pb-2 text-left">Acólito</th>
                        <th className="pb-2 text-center">Serviu</th>
                        <th className="pb-2 text-center">Faltou</th>
                        <th className="pb-2 text-left">Frequência</th>
                        <th className="pb-2 text-center" title="Tendência últimos 3m"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, i) => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 pr-2 font-bold text-gray-400 w-6">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td className="py-2 font-medium text-gray-800 truncate max-w-[120px]">{r.nome}</td>
                          <td className="py-2 text-center">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{r.presente}</span>
                          </td>
                          <td className="py-2 text-center">
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{r.ausente}</span>
                          </td>
                          <td className="py-2"><PctBar pct={r.pct} /></td>
                          <td className="py-2 text-center"><TendenciaIcon t={r.tendencia} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ranking.length > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-2">{ranking.length} acólitos no total</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Funções mais escaladas ─────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-wine-700" /> Funções Mais Escaladas
          </h2>
          {funcoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados de escalas ainda.</p>
          ) : (() => {
            const isMobile = winW < 640
            const yW = isMobile ? 72 : 90
            const fSize = isMobile ? 9 : 10
            const chartH = isMobile ? 240 : 280
            const truncate = (s: string) => s.length > (isMobile ? 10 : 14) ? s.slice(0, isMobile ? 9 : 13) + '…' : s
            return (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart
                  data={funcoes.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: isMobile ? 10 : 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: fSize }} />
                  <YAxis dataKey="funcao" type="category" tick={{ fontSize: fSize }} width={yW}
                    tickFormatter={truncate} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(val, _, p) => [
                      `${val} escalas · ${p.payload.acolitos_unicos} acólitos únicos`,
                      'Total',
                    ]}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} name="Total de escalas">
                    {funcoes.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#7c2d12' : i < 3 ? '#c2410c' : '#fed7aa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </div>

      {/* ── Acólitos em Risco ───────────────────────────── */}
      {risco.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            Acólitos em Risco
            <span className="ml-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {risco.length} {risco.length === 1 ? 'acólito' : 'acólitos'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">Acólitos com 3 ou mais faltas consecutivas registradas.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {risco.map(r => (
              <a key={r.id} href={`/cerimoniarios/${r.id}`}
                 className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{r.nome}</p>
                  <p className="text-xs text-red-600 font-medium mt-0.5">
                    {r.faltas_consecutivas} faltas consecutivas
                  </p>
                  {r.ultima_data && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Última: {new Date(r.ultima_data).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="ml-auto text-red-400 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {risco.length === 0 && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Nenhum acólito em risco</p>
              <p className="text-xs text-gray-500 mt-0.5">Sem 3 ou mais faltas consecutivas registradas no momento.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

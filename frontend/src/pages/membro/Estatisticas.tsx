import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Award, CalendarDays, Target } from 'lucide-react'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const DARK = '#431407'
const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface PorAno  { total: number; serviu: number; faltou: number; justificado: number }
interface PorMes  { total: number; serviu: number }
interface Stats {
  por_ano: Record<string, PorAno>
  por_mes: Record<string, PorMes>
  total_geral: number
  registrado_desde: string | null
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-1">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color: color ?? '#111827' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function MembroEstatisticas() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const anoAtual = new Date().getFullYear()

  useEffect(() => {
    membroApi.get<Stats>('/estatisticas')
      .then(r => setStats(r.data as unknown as Stats))
      .finally(() => setLoading(false))
  }, [])

  const anoData = useMemo(() => {
    if (!stats) return []
    const anoInfo = stats.por_ano[anoAtual] ?? { total: 0, serviu: 0, faltou: 0, justificado: 0 }
    const pct = anoInfo.total > 0 ? Math.round((anoInfo.serviu / anoInfo.total) * 100) : null
    return { ...anoInfo, pct }
  }, [stats, anoAtual])

  const mesChart = useMemo(() => {
    if (!stats) return []
    return Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1)
      const d = stats.por_mes[m] ?? { total: 0, serviu: 0 }
      return { mes: MESES[i + 1], total: d.total, serviu: d.serviu }
    })
  }, [stats])

  const anoChart = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.por_ano).map(([ano, d]) => {
      const pct = d.total > 0 ? Math.round((d.serviu / d.total) * 100) : 0
      return { ano, total: d.total, pct }
    })
  }, [stats])

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 300 }}>
      <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
    </div>
  )

  if (!stats) return null

  const anyData = stats.total_geral > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={22} style={{ color: GOLD }} /> Estatísticas
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Seu histórico no ministério</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total de Escalas" value={stats.total_geral} />
        <StatCard label={`Escalas em ${anoAtual}`} value={(anoData as { total?: number }).total ?? 0} />
        <StatCard
          label="Presença no Ano"
          value={(anoData as { pct?: number | null }).pct !== null && (anoData as { pct?: number | null }).pct !== undefined
            ? `${(anoData as { pct?: number | null }).pct}%`
            : '—'}
          color={(anoData as { pct?: number | null }).pct != null
            ? (anoData as { pct: number }).pct >= 80 ? '#10B981' : (anoData as { pct: number }).pct >= 50 ? GOLD : '#EF4444'
            : '#9CA3AF'}
        />
        <StatCard label="Serviu no Ano" value={(anoData as { serviu?: number }).serviu ?? 0} color="#10B981" />
      </div>

      {anyData ? (
        <>
          {/* Monthly chart */}
          <div className="card p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-4">
              Participação Mensal — {anoAtual}
            </p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', borderRadius: 8, fontSize: 11, border: '1px solid #F3F4F6' }}
                    formatter={(v, n) => [v, n === 'serviu' ? 'Serviu' : 'Total']}
                  />
                  <Bar dataKey="total" fill={`${DARK}18`} radius={[4,4,0,0]} />
                  <Bar dataKey="serviu" fill={GOLD} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: GOLD }} />
                <span className="text-[10px] text-gray-400">Serviu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: `${DARK}18` }} />
                <span className="text-[10px] text-gray-400">Total</span>
              </div>
            </div>
          </div>

          {/* Annual breakdown */}
          {Object.keys(stats.por_ano).length > 1 && (
            <div className="card p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-4">Histórico por Ano</p>
              <div className="space-y-3">
                {Object.entries(stats.por_ano).sort(([a], [b]) => Number(b) - Number(a)).map(([ano, d]) => {
                  const pct = d.total > 0 ? Math.round((d.serviu / d.total) * 100) : 0
                  const color = pct >= 80 ? '#10B981' : pct >= 50 ? GOLD : '#EF4444'
                  return (
                    <div key={ano}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-700">{ano}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{d.serviu}/{d.total} escalas</span>
                          <span className="font-bold" style={{ color }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-14 text-center">
          <Target size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Sem dados ainda</p>
          <p className="text-sm text-gray-400 mt-1">Suas estatísticas aparecerão após suas primeiras escalas.</p>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AreaChart, Area, XAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  CalendarDays, Calendar, ArrowRight, CheckCircle2,
  Clock, Gift, User, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { getMembroUser } from '../../lib/membroAuth'
import logoGrupo from '../../assets/logogrupo.png'
import { parseDate, formatHorario, parseDateParts } from '../../lib/dateUtils'
import { getPeriodoLiturgico } from '../../lib/liturgico'

const GOLD = '#fbbf24'
const INDIGO = '#431407'

const PERIODO_INFO: Record<string, { quote: string; ref: string }> = {
  'Tempo Comum': { quote: 'Ide e fazei discípulos de todos os povos.', ref: 'Mt 28,19' },
  'Advento': { quote: 'Preparai o caminho do Senhor, endireitai as suas veredas.', ref: 'Is 40,3' },
  'Quaresma': { quote: 'Convertei-vos e crede no Evangelho.', ref: 'Mc 1,15' },
  'Tempo Pascal': { quote: 'Eu sou a ressurreição e a vida.', ref: 'Jo 11,25' },
  'Tempo do Natal': { quote: 'O Verbo se fez carne e habitou entre nós.', ref: 'Jo 1,14' },
  'Pentecostes': { quote: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis.', ref: '' },
  'Tríduo Pascal': { quote: 'Por suas chagas fomos curados.', ref: 'Is 53,5' },
}
const FALLBACK = { quote: 'O Senhor é meu pastor e nada me faltará.', ref: 'Sl 23,1' }

const MESES_ABR = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return (
    <div className="font-mono text-right leading-none select-none">
      <span className="text-white font-black" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', letterSpacing: '-0.04em' }}>
        {hh}:{mm}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '-0.04em', fontSize: 'clamp(1.1rem, 2vw, 1.5rem)' }}>
        :{ss}
      </span>
    </div>
  )
}

interface Presenca { status: string }
interface Funcao { titulo: string }
interface Celebracao { data: string; horario: string; periodo_liturgico?: string }
interface EscalaNested { id: number; celebracao: Celebracao; presenca_aberta: boolean }
interface EscalaItem { id: number; escala: EscalaNested; funcao: Funcao | null; funcao_label?: string; presenca: Presenca | null }
interface Aniversariante { id: number; nome: string; foto_base64?: string | null; data_nascimento: string }
interface DashData { proximas_escalas: EscalaItem[]; aniversariantes: Aniversariante[]; ultima_escala: EscalaItem | null }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  serviu: { label: 'Serviu', color: '#10B981', bg: '#10B98115' },
  faltou: { label: 'Faltou', color: '#EF4444', bg: '#EF444415' },
  justificado: { label: 'Justificado', color: '#F59E0B', bg: '#F59E0B15' },
  substituido: { label: 'Substituído', color: '#8B5CF6', bg: '#8B5CF615' },
}

function safeDate(raw: string): Date {
  try { return parseDate(raw) } catch { return new Date() }
}

function daysUntil(raw: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.round((safeDate(raw).getTime() - hoje.getTime()) / 86400000)
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function MembroDashboard() {
  const user = getMembroUser()
  const [dash, setDash] = useState<DashData | null>(null)
  const [allEscalas, setAllEscalas] = useState<EscalaItem[]>([])
  const [loading, setLoading] = useState(true)

  const hoje = new Date()
  const periodo = getPeriodoLiturgico()
  const periodoInfo = PERIODO_INFO[periodo.periodo] ?? FALLBACK

  useEffect(() => {
    Promise.all([
      membroApi.get<DashData>('/dashboard'),
      membroApi.get<EscalaItem[]>('/escalas', { params: { periodo: 'todas' } }),
    ]).then(([d, e]) => {
      setDash(d.data)
      setAllEscalas(Array.isArray(e.data) ? e.data : [])
    }).catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const serviu = allEscalas.filter(i => i.presenca?.status === 'serviu').length
  const faltou = allEscalas.filter(i => i.presenca?.status === 'faltou').length
  const justificado = allEscalas.filter(i => i.presenca?.status === 'justificado').length
  const comStatus = serviu + faltou + justificado
  const pctPresenca = comStatus > 0 ? Math.round((serviu / comStatus) * 100) : null

  const estesMes = allEscalas.filter(i => {
    try {
      const d = safeDate(i.escala.celebracao.data)
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
    } catch { return false }
  }).length

  const proxima = dash?.proximas_escalas?.[0]
  const diasProxima = proxima ? daysUntil(proxima.escala.celebracao.data) : null

  // Monthly sparkline data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, { total: number; serviu: number }> = {}
    allEscalas.forEach(item => {
      const key = item.escala.celebracao.data.substring(0, 7)
      if (!months[key]) months[key] = { total: 0, serviu: 0 }
      months[key].total++
      if (item.presenca?.status === 'serviu') months[key].serviu++
    })
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        mes: MESES_ABR[parseInt(key.split('-')[1])],
        total: v.total,
        serviu: v.serviu,
      }))
  }, [allEscalas])

  const todayStr = format(hoje, 'yyyy-MM-dd')
  const escalaHoje = dash?.proximas_escalas?.filter(i =>
    i.escala.celebracao.data.substring(0, 10) === todayStr) ?? []

  return (
    <div className="space-y-5">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div className="sidebar-gradient rounded-2xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 px-6 pt-6 pb-5">

          {/* Left: identity + period block */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                <img src={logoGrupo} alt="" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <p className="text-white font-bold leading-tight">Ministério dos Acólitos</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {saudacao()}, {user?.nome?.split(' ')[0]}
                </p>
              </div>
            </div>

            <div className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.07)', borderLeft: `3px solid ${GOLD}` }}>
              <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full text-white mb-2"
                style={{ background: GOLD + 'cc' }}>
                {periodo.periodo}
              </span>
              <p className="text-sm italic leading-relaxed max-w-sm"
                style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                "{periodoInfo.quote}"
                {periodoInfo.ref && (
                  <span className="not-italic text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    — {periodoInfo.ref}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: live clock + date + CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto">
            <div>
              <LiveClock />
              <p className="text-[11px] text-right capitalize mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {format(hoje, "EEE, dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <Link
              to="/membro/escalas"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, color: '#ffffff' }}>
              <CalendarDays size={15} />
              Minhas Escalas
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          {([
            { label: 'Total de escalas', value: allEscalas.length, to: '/membro/escalas' },
            { label: 'Presença', value: pctPresenca !== null ? `${pctPresenca}%` : '—', to: '/membro/escalas' },
            { label: 'Este mês', value: estesMes, to: '/membro/calendario' },
            {
              label: 'Próxima escala',
              value: diasProxima !== null
                ? diasProxima === 0 ? 'Hoje' : diasProxima === 1 ? 'Amanhã' : `${diasProxima}d`
                : '—',
              to: '/membro/escalas',
            },
          ] as { label: string; value: string | number; to: string }[]).map(({ label, value, to }, i) => (
            <Link key={label} to={to}
              className="group flex flex-col items-center justify-center gap-0.5 py-3 px-3 hover:bg-white/5 transition-colors"
              style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : undefined }}>
              {loading
                ? <div className="h-6 w-10 rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
                : <span className="text-xl font-extrabold leading-none text-white">{value}</span>
              }
              <span className="text-[10px] font-medium text-center leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Presença */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {loading
                ? <div className="skeleton h-8 w-12 rounded" />
                : <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                  {pctPresenca !== null ? `${pctPresenca}%` : '—'}
                </div>
              }
              <p className="text-xs text-gray-400 mt-0.5">Índice de presença</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#10B98112' }}>
              <CheckCircle2 size={19} style={{ color: '#10B981' }} />
            </div>
          </div>
          {!loading && comStatus > 0 && pctPresenca !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium">
                <span className="text-gray-400">{serviu} de {comStatus} serviços</span>
                <span className="text-gray-700">{pctPresenca}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pctPresenca}%`,
                    background: pctPresenca >= 80
                      ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                      : pctPresenca >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        : 'linear-gradient(90deg,#c2410c,#ef4444)',
                  }} />
              </div>
            </div>
          )}
        </div>

        {/* Última celebração */}
        <div className="card p-5" style={{ borderLeft: `4px solid ${GOLD}` }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-3">Última Celebração</p>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-8 w-20 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
          ) : dash?.ultima_escala ? (
            <>
              <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                {format(safeDate(dash.ultima_escala.escala.celebracao.data), "dd/MM", { locale: ptBR })}
              </div>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                {format(safeDate(dash.ultima_escala.escala.celebracao.data), "EEEE", { locale: ptBR })}
              </p>
              {(dash.ultima_escala.funcao?.titulo ?? dash.ultima_escala.funcao_label) && (
                <p className="text-xs text-gray-400 mt-0.5">{dash.ultima_escala.funcao?.titulo ?? dash.ultima_escala.funcao_label}</p>
              )}
              {dash.ultima_escala.presenca?.status && STATUS_CONFIG[dash.ultima_escala.presenca.status] && (
                <span className="inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: STATUS_CONFIG[dash.ultima_escala.presenca.status].bg,
                    color: STATUS_CONFIG[dash.ultima_escala.presenca.status].color,
                  }}>
                  {STATUS_CONFIG[dash.ultima_escala.presenca.status].label}
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Sem celebrações anteriores</p>
          )}
        </div>

        {/* Próxima escala */}
        <div className="card p-5 space-y-3" style={{ borderTop: `3px solid ${GOLD}` }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Próxima Escala</p>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-8 w-20 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
          ) : proxima ? (
            <>
              <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                {diasProxima === 0 ? 'Hoje' : diasProxima === 1 ? 'Amanhã' : `Em ${diasProxima} dias`}
              </div>
              <p className="text-sm text-gray-600">
                {format(safeDate(proxima.escala.celebracao.data), "dd 'de' MMMM", { locale: ptBR })}
                <span className="text-gray-400 ml-1">· {formatHorario(proxima.escala.celebracao.horario)}</span>
              </p>
              {(proxima.funcao?.titulo ?? proxima.funcao_label) && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: GOLD + '25', color: '#f59e0b' }}>
                  {proxima.funcao?.titulo ?? proxima.funcao_label}
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Sem escalas futuras</p>
          )}
        </div>
      </div>

      {/* ── ESCALAS DE HOJE ────────────────────────────────────────────────── */}
      {!loading && escalaHoje.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
            <Clock size={15} style={{ color: INDIGO }} />
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Você serve hoje
            </h2>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: GOLD, background: GOLD + '20' }}>
              {escalaHoje.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {escalaHoje.map(item => (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatHorario(item.escala.celebracao.horario)}
                  </span>
                  {(item.funcao?.titulo ?? item.funcao_label) && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: INDIGO + '12', color: INDIGO }}>
                      {item.funcao?.titulo ?? item.funcao_label}
                    </span>
                  )}
                  {item.escala.presenca_aberta && !item.presenca && (
                    <Link to="/membro/escalas"
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                      ● Confirme presença
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ANIVERSARIANTES DO DIA ─────────────────────────────────────────── */}
      {!!dash?.aniversariantes?.length && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
            <Gift size={15} className="text-amber-500" />
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Aniversariantes de Hoje
            </h2>
            <span className="ml-auto text-xs font-semibold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
              {dash.aniversariantes.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 px-5 py-4">
            {dash.aniversariantes.map(a => {
              const ini = a.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
              const idade = a.data_nascimento
                ? hoje.getFullYear() - safeDate(a.data_nascimento).getFullYear()
                : null
              return (
                <div key={a.id} className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  {a.foto_base64 ? (
                    <img src={a.foto_base64} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: INDIGO }}>
                      <span style={{ color: GOLD }} className="text-[10px] font-bold">{ini}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{a.nome}</p>
                    {idade !== null && (
                      <p className="text-xs text-amber-500 font-medium">{idade} anos 🎂</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Próximas escalas timeline — 2/3 */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Linha do Tempo
            </h2>
            <Link to="/membro/escalas"
              className="text-xs font-semibold transition-colors flex items-center gap-1"
              style={{ color: GOLD }}>
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="skeleton h-4 rounded w-2/5" />
                      <div className="skeleton h-3 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dash?.proximas_escalas?.length ? (
              <div className="relative">
                <div className="absolute left-[21px] top-6 bottom-6 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent pointer-events-none" />
                <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                  {dash.proximas_escalas.map((item, i) => {
                    const d = item.escala.celebracao.data
                    const { day, month, weekday } = parseDateParts(d)
                    const isFirst = i === 0
                    const days = daysUntil(d)
                    const janelaAberta = item.escala.presenca_aberta && !item.presenca
                    const nodeColor = days === 0 ? GOLD : INDIGO
                    const nodeText = days === 0 ? '#0D0B1E' : 'white'

                    return (
                      <Link key={item.id} to="/membro/escalas"
                        className={`relative flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group ${isFirst ? 'bg-gray-50/70 ring-1 ring-gray-100' : ''}`}>
                        <div className="flex-shrink-0 w-11 h-11 rounded-full flex flex-col items-center justify-center z-10 shadow-sm"
                          style={{ background: `linear-gradient(145deg, ${nodeColor}cc, ${nodeColor})`, color: nodeText }}>
                          <span className="text-[7px] font-bold uppercase leading-none opacity-80">{weekday}</span>
                          <span className="text-sm font-extrabold leading-tight">{day}</span>
                          <span className="text-[7px] font-bold uppercase leading-none opacity-80">{month}</span>
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">
                              {format(safeDate(d), "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="text-xs text-gray-400">{formatHorario(item.escala.celebracao.horario)}</span>
                          </div>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {item.funcao?.titulo && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: INDIGO + '12', color: INDIGO }}>
                                {item.funcao.titulo}
                              </span>
                            )}
                            {janelaAberta && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 animate-pulse">
                                ● Confirme presença
                              </span>
                            )}
                          </div>
                        </div>

                        {isFirst && (
                          <span className="flex-shrink-0 self-start text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                            style={{ background: GOLD + '20', color: GOLD }}>
                            Próxima
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-14 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <CalendarDays size={22} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-500 text-sm">Sem escalas futuras</p>
                <p className="text-xs text-gray-400 mt-1">Você será notificado quando houver uma escala</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">

          {/* Monthly sparkline */}
          {!loading && monthlyData.length > 1 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.16em]">Participação Mensal</p>
                <TrendingUp size={13} className="text-gray-300" />
              </div>
              <div className="h-[72px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 2, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={INDIGO} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={INDIGO} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradServiu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'white', borderRadius: 8, fontSize: 10, border: '1px solid #F3F4F6', padding: '4px 8px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke={`${INDIGO}50`} strokeWidth={1.5} fill="url(#gradTotal)" dot={false} />
                    <Area type="monotone" dataKey="serviu" stroke="#10B981" strokeWidth={2} fill="url(#gradServiu)" dot={{ r: 2, fill: '#10B981' }} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded" style={{ background: `${INDIGO}50` }} />
                  <span className="text-[9px] text-gray-400">Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded" style={{ background: '#10B981' }} />
                  <span className="text-[9px] text-gray-400">Serviu</span>
                </div>
              </div>
            </div>
          )}

          {/* Presença breakdown */}
          {!loading && comStatus > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.16em]">Presença Geral</p>
                {pctPresenca !== null && (
                  <span className="text-lg font-extrabold"
                    style={{ color: pctPresenca >= 80 ? '#10B981' : pctPresenca >= 50 ? '#fbbf24' : '#EF4444' }}>
                    {pctPresenca}%
                  </span>
                )}
              </div>
              {/* Stacked bar */}
              <div className="h-2.5 rounded-full overflow-hidden flex gap-px mb-3" style={{ background: '#F3F4F6' }}>
                {serviu > 0 && <div style={{ flex: serviu, background: '#10B981' }} className="h-full first:rounded-l-full" />}
                {justificado > 0 && <div style={{ flex: justificado, background: '#F59E0B' }} className="h-full" />}
                {faltou > 0 && <div style={{ flex: faltou, background: '#EF4444' }} className="h-full last:rounded-r-full" />}
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Serviu', n: serviu, color: '#10B981' },
                  { label: 'Justificado', n: justificado, color: '#F59E0B' },
                  { label: 'Faltou', n: faltou, color: '#EF4444' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-xs text-gray-500 flex-1">{r.label}</span>
                    <span className="text-xs font-bold" style={{ color: r.n > 0 ? r.color : '#D1D5DB' }}>{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.16em]">Navegação Rápida</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {([
                { label: 'Minhas Escalas', desc: 'Ver histórico e próximas', icon: CalendarDays, to: '/membro/escalas', accent: GOLD },
                { label: 'Calendário', desc: 'Visualizar no calendário', icon: Calendar, to: '/membro/calendario', accent: '#6366F1' },
                { label: 'Aniversariantes', desc: 'Aniversários do ministério', icon: Gift, to: '/membro/aniversariantes', accent: '#fbbf24' },
                { label: 'Meu Perfil', desc: 'Editar dados e senha', icon: User, to: '/membro/perfil', accent: '#10B981' },
              ]).map(({ label, desc, icon: Icon, to, accent }) => (
                <Link key={label} to={to}
                  className="flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: accent + '15' }}>
                    <Icon size={16} style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{desc}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-200 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardAlertaConfirmacao, DashboardAlertaConflito } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, ArrowRight, CheckCircle2, AlertCircle,
  ListChecks, Calendar, Users, Cross, Clock, X, Gift,
} from 'lucide-react'
import api from '../lib/api'
import type { Dashboard as DashboardData } from '../types'
import type { AniversarioCerimoniario } from '../types'
import toast from 'react-hot-toast'
import { formatHorario, parseDateParts } from '../lib/dateUtils'
import { getPeriodoLiturgico, getPeriodoBadgeVariant } from '../lib/liturgico'
import Badge from '../components/common/Badge'

// ─── Season data ───────────────────────────────────────────────────────────

const PERIODO_INFO: Record<string, { quote: string; ref: string }> = {
  'Tempo Comum':    { quote: 'Ide e fazei discípulos de todos os povos.',                  ref: 'Mt 28,19' },
  'Advento':        { quote: 'Preparai o caminho do Senhor, endireitai as suas veredas.',  ref: 'Is 40,3'  },
  'Quaresma':       { quote: 'Convertei-vos e crede no Evangelho.',                        ref: 'Mc 1,15'  },
  'Tempo Pascal':   { quote: 'Eu sou a ressurreição e a vida.',                            ref: 'Jo 11,25' },
  'Tempo do Natal': { quote: 'O Verbo se fez carne e habitou entre nós.',                  ref: 'Jo 1,14'  },
  'Pentecostes':    { quote: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis.',ref: ''         },
  'Tríduo Pascal':  { quote: 'Por suas chagas fomos curados.',                             ref: 'Is 53,5'  },
}

const FALLBACK = { quote: 'O Senhor é meu pastor e nada me faltará.', ref: 'Sl 23,1' }

function hexFromPeriodo(periodo: string): string {
  const v = getPeriodoBadgeVariant(periodo)
  return (
    { purple: '#7c3aed', green: '#16a34a', blue: '#3b82f6', red: '#ef4444', wine: '#c2410c' }[v] ?? '#c2410c'
  )
}

// ─── Live clock ────────────────────────────────────────────────────────────

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
      <span className="text-white/30 font-bold" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', letterSpacing: '-0.04em' }}>:{ss}</span>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [alertasModal, setAlertasModal] = useState<'confirmacao' | 'conflito' | null>(null)
  const [aniversariantes, setAniversariantes] = useState<AniversarioCerimoniario[]>([])

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))

    api.get<AniversarioCerimoniario[]>('/cerimoniarios/aniversarios')
      .then(r => setAniversariantes(r.data.filter(a => a.dias_para_aniversario === 0)))
      .catch(() => {})
  }, [])

  const periodo = getPeriodoLiturgico()
  const periodoInfo = PERIODO_INFO[periodo.periodo] ?? FALLBACK
  const hex = hexFromPeriodo(periodo.periodo)
  const hoje = new Date()
  const semEscala = data?.celebracoesSemEscala ?? 0
  const conflitos = data?.alertasConflito?.length ?? 0

  const nextCelebration = data?.proximasCelebracoes?.[0]
  const daysUntilNext = (() => {
    if (!nextCelebration) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(nextCelebration.data.substring(0, 10) + 'T00:00:00')
    return Math.round((target.getTime() - today.getTime()) / 86400000)
  })()

  const totalCelebracoes = (data?.escalasDoMes ?? 0) + semEscala
  const pctEscaladas = totalCelebracoes > 0
    ? Math.round(((data?.escalasDoMes ?? 0) / totalCelebracoes) * 100)
    : null

  return (
    <div className="space-y-5">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <div className="sidebar-gradient rounded-2xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 px-6 pt-6 pb-5">

          {/* Left: identity + period block */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Ministry header */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                <Cross size={17} className="text-wine-900" />
              </div>
              <div>
                <p className="text-white font-bold leading-tight">Ministério dos Acólitos</p>
                <p className="text-white/35 text-xs">Central de Gestão</p>
              </div>
            </div>

            {/* Period + scripture */}
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.07)', borderLeft: `3px solid ${hex}` }}
            >
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full text-white mb-2"
                style={{ background: hex + 'cc' }}
              >
                {periodo.periodo}
              </span>
              <p
                className="text-sm italic text-white/65 leading-relaxed max-w-sm"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                "{periodoInfo.quote}"
                {periodoInfo.ref && (
                  <span className="not-italic text-white/30 text-xs ml-1.5">— {periodoInfo.ref}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: live clock + date + CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto">
            <div>
              <LiveClock />
              <p className="text-white/35 text-[11px] text-right capitalize mt-1">
                {format(hoje, "EEE, dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <Link
              to="/escalas/nova"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md text-wine-900 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
            >
              <Plus size={15} />
              Nova Escala
            </Link>
          </div>
        </div>

        {/* Bottom stat strip inside hero */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}
        >
          {[
            { label: 'Escalas no mês',       value: data?.escalasDoMes               ?? '—', to: '/escalas'       },
            { label: 'Cerimoniários ativos',  value: data?.cerimoniarios_ativos       ?? '—', to: '/cerimoniarios' },
            { label: 'Próximas celebrações',  value: data?.proximasCelebracoes?.length ?? '—', to: '/celebracoes'  },
            { label: 'Aguardando escala',     value: semEscala,                               to: '/celebracoes'   },
          ].map(({ label, value, to }, i) => {
            const isLast = i === 3
            const isAlert = isLast && typeof value === 'number' && value > 0
            return (
              <Link
                key={label}
                to={to}
                className="group flex flex-col items-center justify-center gap-0.5 py-3 px-3 hover:bg-white/5 transition-colors"
                style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : undefined }}
              >
                {loading
                  ? <div className="skeleton h-6 w-10 rounded bg-white/10" />
                  : <span className={`text-xl font-extrabold leading-none ${isAlert ? 'text-red-400' : 'text-white'}`}>
                      {value}
                    </span>
                }
                <span className="text-white/35 text-[10px] font-medium text-center leading-tight">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Escalas — with progress bar */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {loading
                ? <div className="skeleton h-8 w-12 rounded" />
                : <div className="text-3xl font-extrabold tracking-tight text-gray-900">{data?.escalasDoMes ?? 0}</div>
              }
              <p className="text-xs text-gray-400 mt-0.5">Escalas este mês</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-wine-50 flex items-center justify-center">
              <ListChecks size={19} className="text-wine-700" />
            </div>
          </div>
          {!loading && pctEscaladas !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium">
                <span className="text-gray-400">Celebrações escaladas</span>
                <span className="text-gray-700">{pctEscaladas}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pctEscaladas}%`,
                    background: pctEscaladas >= 80 ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                      : pctEscaladas >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                      : 'linear-gradient(90deg,#c2410c,#ef4444)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* System status */}
        <div className={`card p-5 border-l-4 ${semEscala > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-3">Status</p>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${semEscala > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${semEscala > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                </div>
                <span className={`font-bold text-sm ${semEscala > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {semEscala > 0 ? `${semEscala} sem escala` : 'Tudo escalado'}
                </span>
              </div>
              {semEscala > 0 ? (
                <Link to="/celebracoes" className="block w-full text-center py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                  Resolver agora →
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Nenhuma pendência
                </div>
              )}
              {conflitos > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    {conflitos} conflito{conflitos > 1 ? 's' : ''} nas escalas
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next celebration spotlight */}
        <div
          className="card p-5 space-y-3"
          style={{ borderTop: `3px solid ${nextCelebration ? hexFromPeriodo(nextCelebration.periodo_liturgico) : '#e5e7eb'}` }}
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Próxima Celebração</p>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-8 w-20 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
          ) : nextCelebration ? (
            <>
              <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                {daysUntilNext === 0 ? 'Hoje' : daysUntilNext === 1 ? 'Amanhã' : `Em ${daysUntilNext} dias`}
              </div>
              <p className="text-sm text-gray-600">
                {format(new Date(nextCelebration.data.substring(0, 10) + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                <span className="text-gray-400 ml-1">· {formatHorario(nextCelebration.horario)}</span>
              </p>
              <Badge variant={getPeriodoBadgeVariant(nextCelebration.periodo_liturgico)} size="sm">
                {nextCelebration.periodo_liturgico}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sem celebrações futuras</p>
          )}
        </div>
      </div>

      {/* ── HOJE WIDGET ────────────────────────────────────────────────── */}
      {!loading && data?.celebracoesHoje && data.celebracoesHoje.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
            <Clock size={15} className="text-wine-700" />
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Celebrações de Hoje
            </h2>
            <span className="ml-auto text-xs font-semibold text-wine-700 bg-wine-50 px-2 py-0.5 rounded-full">
              {data.celebracoesHoje.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.celebracoesHoje.map(cel => {
              const itens = cel.escala?.itens ?? []
              return (
                <div key={cel.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatHorario(cel.horario)}
                    </span>
                    <Badge variant={getPeriodoBadgeVariant(cel.periodo_liturgico)} size="sm">
                      {cel.periodo_liturgico}
                    </Badge>
                  </div>
                  {itens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {itens.map(item => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-50 rounded-lg text-gray-700 border border-gray-100"
                        >
                          <span className="font-medium">{item.cerimoniario?.nome ?? '—'}</span>
                          {item.funcao_label && (
                            <span className="text-gray-400">· {item.funcao_label}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sem cerimoniários escalados</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ANIVERSARIANTES DO DIA ─────────────────────────────────────── */}
      {aniversariantes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
            <Gift size={15} className="text-amber-500" />
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Aniversariantes de Hoje
            </h2>
            <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {aniversariantes.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 px-5 py-4">
            {aniversariantes.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"
              >
                <div className="w-8 h-8 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-400 text-[10px] font-bold">
                    {a.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{a.nome}</p>
                  <p className="text-xs text-amber-600 font-medium">{a.idade} anos 🎂</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ALERTAS WIDGET ─────────────────────────────────────────────── */}
      {!loading && (data?.alertasConfirmacao?.length || conflitos > 0) && (
        <div className="space-y-2">

          {/* Conflitos — primeiro card + ver mais */}
          {conflitos > 0 && (() => {
            const first = data!.alertasConflito[0]
            const extra = conflitos - 1
            return (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">
                  <span className="font-bold">{first.cerimoniario_nome}</span>
                  {' '}escalado em{' '}
                  <span className="font-bold">{first.qtd_escalas} celebrações</span>
                  {' '}— {format(new Date(first.data.substring(0, 10) + 'T12:00:00'), "dd/MM", { locale: ptBR })} às {formatHorario(first.horario)}
                  {extra > 0 && (
                    <button
                      onClick={() => setAlertasModal('conflito')}
                      className="ml-2 underline text-red-700 font-semibold hover:text-red-900"
                    >
                      +{extra} conflito{extra > 1 ? 's' : ''}
                    </button>
                  )}
                </p>
                <Link to="/escalas" className="ml-auto text-xs font-bold text-red-700 hover:text-red-900 flex-shrink-0">
                  Ver →
                </Link>
              </div>
            )
          })()}

          {/* Confirmações — primeiro card + ver mais */}
          {(data?.alertasConfirmacao?.length ?? 0) > 0 && (() => {
            const list = data!.alertasConfirmacao!
            const first = list[0]
            const extra = list.length - 1
            return (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800">
                  <span className="font-bold">{first.pendentes} confirmaç{first.pendentes > 1 ? 'ões' : 'ão'} pendente{first.pendentes > 1 ? 's' : ''}</span>
                  {' '}— {format(new Date(first.data.substring(0, 10) + 'T12:00:00'), "dd/MM", { locale: ptBR })} às {formatHorario(first.horario)}
                  {' · '}{first.periodo_liturgico}
                  {extra > 0 && (
                    <button
                      onClick={() => setAlertasModal('confirmacao')}
                      className="ml-2 underline text-amber-700 font-semibold hover:text-amber-900"
                    >
                      +{extra} celebraç{extra > 1 ? 'ões' : 'ão'}
                    </button>
                  )}
                </p>
                <Link
                  to="/celebracoes"
                  state={{ openCelebracaoId: first.celebracao_id }}
                  className="ml-auto text-xs font-bold text-amber-700 hover:text-amber-900 flex-shrink-0"
                >
                  Ver →
                </Link>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── MODAL: todos os alertas ──────────────────────────────────────── */}
      {alertasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className={alertasModal === 'conflito' ? 'text-red-600' : 'text-amber-600'} />
                <h2 className="font-bold text-gray-900 text-sm">
                  {alertasModal === 'conflito' ? 'Conflitos de escala' : 'Confirmações pendentes'}
                </h2>
              </div>
              <button onClick={() => setAlertasModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {alertasModal === 'conflito'
                ? (data?.alertasConflito ?? []).map((c: DashboardAlertaConflito, i: number, arr) => (
                  <div key={i} className={`px-5 py-3.5 flex items-start gap-3 ${i < arr.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.cerimoniario_nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.qtd_escalas} celebrações simultâneas —{' '}
                        {format(new Date(c.data.substring(0, 10) + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {formatHorario(c.horario)}
                      </p>
                    </div>
                  </div>
                ))
                : (data?.alertasConfirmacao ?? []).map((a: DashboardAlertaConfirmacao, i: number, arr) => (
                  <Link
                    key={a.celebracao_id}
                    to="/celebracoes"
                    state={{ openCelebracaoId: a.celebracao_id }}
                    onClick={() => setAlertasModal(null)}
                    className={`w-full px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(a.data.substring(0, 10) + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatHorario(a.horario)} · {a.periodo_liturgico} · {a.pendentes} pendente{a.pendentes > 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-gray-300 flex-shrink-0 mt-1" />
                  </Link>
                ))
              }
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100">
              <button
                onClick={() => setAlertasModal(null)}
                className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Timeline — 2/3 */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              Linha do Tempo
            </h2>
            <Link to="/celebracoes" className="text-xs text-wine-700 hover:text-wine-900 font-semibold transition-colors flex items-center gap-1">
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
            ) : data?.proximasCelebracoes?.length ? (
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-[21px] top-6 bottom-6 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent pointer-events-none" />

                <div className="space-y-1 max-h-[252px] overflow-y-auto pr-1 -mr-1">
                  {data.proximasCelebracoes.map((c, i) => {
                    const dateStr = c.data.substring(0, 10)
                    const { day, month, weekday } = parseDateParts(dateStr)
                    const cHex = hexFromPeriodo(c.periodo_liturgico)
                    const isFirst = i === 0
                    return (
                      <Link
                        key={c.id}
                        to="/celebracoes"
                        state={{ openCelebracaoId: c.id }}
                        className={`relative flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group ${isFirst ? 'bg-gray-50/70 ring-1 ring-gray-100' : ''}`}
                      >
                        {/* Date node */}
                        <div
                          className="flex-shrink-0 w-11 h-11 rounded-full flex flex-col items-center justify-center text-white z-10 shadow-sm"
                          style={{ background: `linear-gradient(145deg, ${cHex}cc, ${cHex})` }}
                        >
                          <span className="text-[7px] font-bold uppercase leading-none opacity-80">{weekday}</span>
                          <span className="text-sm font-extrabold leading-tight">{day}</span>
                          <span className="text-[7px] font-bold uppercase leading-none opacity-80">{month}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">
                              {format(new Date(dateStr + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="text-xs text-gray-400">{formatHorario(c.horario)}</span>
                          </div>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant={getPeriodoBadgeVariant(c.periodo_liturgico)} size="sm">
                              {c.periodo_liturgico}
                            </Badge>
                            {c.possui_bispo      && <Badge variant="purple" size="sm">Bispo</Badge>}
                            {c.casamento         && <Badge variant="gold"   size="sm">Casamento</Badge>}
                            {c.celebracao_noite  && <Badge variant="blue"   size="sm">Noturna</Badge>}
                            {c.escala
                              ? <Badge variant="green" size="sm">Escalada</Badge>
                              : <Badge variant="red"   size="sm">Sem escala</Badge>}
                          </div>
                        </div>

                        {isFirst && (
                          <span className="flex-shrink-0 self-start text-[10px] font-bold text-wine-700 bg-wine-50 px-2 py-0.5 rounded-full mt-1">
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
                  <Calendar size={22} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-500 text-sm">Sem celebrações cadastradas</p>
                <Link to="/celebracoes" className="mt-4 btn-primary text-sm px-4 py-2">
                  <Plus size={14} /> Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions — 1/3 */}
        <div className="card overflow-hidden self-start">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.16em]">Ações Rápidas</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {([
              { label: 'Nova Escala',       desc: 'Monte uma escala de serviço',        icon: ListChecks, to: '/escalas/nova',  accent: '#c2410c' },
              { label: 'Nova Celebração',   desc: 'Cadastre uma celebração litúrgica',  icon: Calendar,   to: '/celebracoes',   accent: '#7c3aed' },
              { label: 'Novo Cerimoniário', desc: 'Adicione um membro ao ministério',   icon: Users,      to: '/cerimoniarios', accent: '#f59e0b' },
            ]).map(({ label, desc, icon: Icon, to, accent }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: accent + '15' }}
                >
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
  )
}

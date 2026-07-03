import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft, ChevronRight, Clock, MapPin, X, CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { parseDate, formatHorario } from '../../lib/dateUtils'
import JustificativaModal from '../../components/common/JustificativaModal'

const INDIGO = '#431407'

interface MembroCelebracao {
  data: string
  horario: string
  periodo_liturgico?: string
  local?: string
  observacao?: string
  celebracao_noite?: boolean
  possui_bispo?: boolean
  celebracao_6h?: boolean
  celebracao_palavra?: boolean
  celebracao_solene?: boolean
  casamento?: boolean
  batismo?: boolean
  crisma?: boolean
  primeira_eucaristia?: boolean
  adoracao_santissimo?: boolean
  exequias?: boolean
  ordenacao?: boolean
  missa_crismal?: boolean
  corpus_christi?: boolean
  via_sacra?: boolean
  vigilia_pascal?: boolean
  paixao_senhor?: boolean
}

interface EscalaItem {
  id: number
  status_confirmacao?: string | null
  escala: {
    id: number
    celebracao: MembroCelebracao
    presenca_aberta: boolean
    observacao?: string
  }
  funcao: { titulo: string } | null
  funcao_label?: string
  presenca: { id: number; status: string; status_confirmacao?: string | null; justificativa_status?: 'pendente' | 'aprovada' | 'rejeitada' | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  serviu: '#10B981',
  faltou: '#EF4444',
  justificado: '#F59E0B',
  substituido: '#8B5CF6',
}

const STATUS_LABEL: Record<string, string> = {
  serviu: 'Serviu',
  faltou: 'Faltou',
  justificado: 'Justificado',
  substituido: 'Substituído',
}

function getCelebInfo(cel: MembroCelebracao): { color: string; label: string } {
  if (cel.casamento) return { color: '#EC4899', label: 'Casamento' }
  if (cel.batismo) return { color: '#06B6D4', label: 'Batismo' }
  if (cel.crisma) return { color: '#8B5CF6', label: 'Crisma' }
  if (cel.primeira_eucaristia) return { color: '#F59E0B', label: '1ª Eucaristia' }
  if (cel.exequias) return { color: '#6B7280', label: 'Exéquias' }
  if (cel.ordenacao) return { color: '#A855F7', label: 'Ordenação' }
  if (cel.corpus_christi) return { color: '#f59e0b', label: 'Corpus Christi' }
  if (cel.missa_crismal) return { color: '#EF4444', label: 'Missa Crismal' }
  if (cel.vigilia_pascal) return { color: '#FBBF24', label: 'Vigília Pascal' }
  if (cel.paixao_senhor) return { color: '#DC2626', label: 'Paixão do Senhor' }
  if (cel.via_sacra) return { color: '#92400E', label: 'Via Sacra' }
  if (cel.adoracao_santissimo) return { color: '#F59E0B', label: 'Adoração' }
  if (cel.celebracao_solene) return { color: '#F59E0B', label: 'Solene' }
  if (cel.celebracao_palavra) return { color: '#22C55E', label: 'Palavra' }
  if (cel.celebracao_6h) return { color: '#78716C', label: 'Missa 6h' }
  if (cel.celebracao_noite) return { color: '#3B82F6', label: 'Noturna' }
  return { color: INDIGO, label: 'Missa' }
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function MembroCalendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [escalas, setEscalas] = useState<EscalaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<EscalaItem[] | null>(null)
  const [drawerDate, setDrawerDate] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [justItem, setJustItem] = useState<EscalaItem | null>(null)
  const [salvandoJust, setSalvandoJust] = useState(false)

  async function loadCalendario(month: Date): Promise<EscalaItem[]> {
    setLoading(true)
    const mes = month.getMonth() + 1
    const ano = month.getFullYear()
    try {
      const r = await membroApi.get<EscalaItem[]>('/calendario', { params: { mes, ano } })
      const data = Array.isArray(r.data) ? r.data : []
      setEscalas(data)
      return data
    } catch {
      toast.error('Erro ao carregar calendário')
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setDrawer(null)
    loadCalendario(currentMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Build map date-string → items
  const escalaMap: Record<string, EscalaItem[]> = {}
  for (const item of escalas) {
    const key = item.escala.celebracao.data.substring(0, 10)
    if (!escalaMap[key]) escalaMap[key] = []
    escalaMap[key].push(item)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  function openDrawer(key: string) {
    const items = escalaMap[key]
    if (items?.length) {
      setDrawerDate(key)
      setDrawer([...items].sort((a, b) =>
        a.escala.celebracao.horario.localeCompare(b.escala.celebracao.horario)))
    }
  }

  async function refreshDrawer(fresh: EscalaItem[]) {
    if (drawerDate) {
      const updated = fresh.filter(i => i.escala.celebracao.data.substring(0, 10) === drawerDate)
      setDrawer(updated.length
        ? [...updated].sort((a, b) => a.escala.celebracao.horario.localeCompare(b.escala.celebracao.horario))
        : null)
    }
  }

  async function handleConfirmarEscala(item: EscalaItem) {
    setConfirmandoId(item.id)
    try {
      await membroApi.post(`/escala-itens/${item.id}/confirmar`)
      toast.success('✅ Escala confirmada!')
      refreshDrawer(await loadCalendario(currentMonth))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao confirmar escala')
    } finally {
      setConfirmandoId(null)
    }
  }

  async function handleServiu(item: EscalaItem) {
    setConfirmandoId(item.id)
    try {
      await membroApi.put(`/escala-itens/${item.id}/presenca`, { status: 'serviu' })
      toast.success('✅ Presença confirmada!')
      refreshDrawer(await loadCalendario(currentMonth))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar presença')
    } finally {
      setConfirmandoId(null)
    }
  }

  async function handleJustificar(item: EscalaItem, observacao?: string) {
    if (observacao === undefined) { setJustItem(item); return }
    setSalvandoJust(true)
    try {
      await membroApi.put(`/escala-itens/${item.id}/presenca`, { status: 'justificado', observacao })
      toast.success('⚠️ Justificativa registrada.')
      setJustItem(null)
      refreshDrawer(await loadCalendario(currentMonth))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar justificativa')
    } finally {
      setSalvandoJust(false)
    }
  }

  // Monthly summary
  const pfx = format(currentMonth, 'yyyy-MM')
  const mesItens = escalas.filter(i => i.escala.celebracao.data.startsWith(pfx))
  const serv = mesItens.filter(i => i.presenca?.status === 'serviu').length

  return (
    <div className="flex flex-col space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(180deg, var(--theme-btn-from), var(--theme-btn-to))' }} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Calendário</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors"
            style={{ color: '#fbbf24', borderColor: '#fbbf2466', background: '#fffbeb' }}>
            Hoje
          </button>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-bold text-gray-800 capitalize min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Missa', color: INDIGO },
          { label: 'Noturna', color: '#3B82F6' },
          { label: 'Casamento', color: '#EC4899' },
          { label: 'Batismo', color: '#06B6D4' },
          { label: 'Crisma', color: '#8B5CF6' },
          { label: 'Solene', color: '#F59E0B' },
          { label: 'Palavra', color: '#22C55E' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2 border-l border-gray-200 pl-3">
          <span className="font-bold text-emerald-600">✓</span> Serviu
        </div>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="card overflow-x-auto">
        <div className="min-w-[560px]">

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 sidebar-gradient">
            {WEEK_DAYS.map((day, i) => (
              <div key={day}
                className="py-3 text-center text-xs font-bold uppercase tracking-wider"
                style={{ color: i === 0 ? '#FCA5A5' : i === 6 ? '#93C5FD' : 'rgba(255,255,255,0.7)' }}>
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(234,88,12,0.25)', borderTopColor: 'rgb(var(--w-600))' }} />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                const key = format(day, 'yyyy-MM-dd')
                const items = (escalaMap[key] ?? []).sort((a, b) =>
                  a.escala.celebracao.horario.localeCompare(b.escala.celebracao.horario))
                const inMonth = isSameMonth(day, currentMonth)
                const isT = isToday(day)
                const isSun = idx % 7 === 0
                const isSat = idx % 7 === 6

                return (
                  <div key={key}
                    className="border-r border-b border-gray-100 p-1.5 min-h-[110px] flex flex-col transition-colors"
                    style={{
                      background: !inMonth
                        ? 'rgba(249,250,251,0.8)'
                        : isSun || isSat
                          ? 'rgba(13,11,30,0.015)'
                          : 'white',
                    }}>

                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full"
                        style={{
                          background: isT ? 'linear-gradient(135deg, var(--theme-btn-from), var(--theme-btn-to))' : 'transparent',
                          color: isT ? 'white'
                            : !inMonth ? '#D1D5DB'
                              : isSun ? '#EF4444'
                                : isSat ? '#3B82F6'
                                  : '#374151',
                          fontWeight: isT ? 800 : 600,
                          boxShadow: isT ? '0 2px 8px rgba(194,65,12,0.4)' : 'none',
                        }}>
                        {format(day, 'd')}
                      </span>
                      {items.length > 0 && inMonth && (
                        <span className="text-[9px] text-gray-400 font-medium">{items.length}×</span>
                      )}
                    </div>

                    {/* Celebration pills */}
                    {inMonth && (
                      <div className="space-y-0.5 flex-1">
                        {items.slice(0, 3).map(item => {
                          const cel = item.escala.celebracao
                          const { color, label } = getCelebInfo(cel)
                          const st = item.presenca?.status
                          const pillColor = st && STATUS_COLOR[st] ? STATUS_COLOR[st] : color
                          return (
                            <button
                              key={item.id}
                              onClick={() => openDrawer(key)}
                              className="w-full text-left px-1.5 py-1 rounded text-white hover:opacity-85 active:opacity-70 transition-opacity cursor-pointer"
                              style={{ background: pillColor }}
                              title={`${formatHorario(cel.horario)} — ${label} — ${item.funcao?.titulo ?? item.funcao_label ?? ''}`}>
                              <div className="flex items-center gap-1 text-[10px] font-semibold">
                                <Clock size={7} className="flex-shrink-0 opacity-80" />
                                <span className="font-bold">{formatHorario(cel.horario)}</span>
                                <span className="truncate opacity-90">{label}</span>
                                {st === 'serviu' && (
                                  <span className="ml-auto text-emerald-200 flex-shrink-0">✓</span>
                                )}
                              </div>
                              {(item.funcao?.titulo ?? item.funcao_label) && (
                                <div className="text-[8.5px] opacity-75 truncate mt-0.5 pl-3.5 font-medium leading-none">
                                  {item.funcao?.titulo ?? item.funcao_label}
                                </div>
                              )}
                            </button>
                          )
                        })}
                        {items.length > 3 && (
                          <button
                            onClick={() => openDrawer(key)}
                            className="text-[10px] font-semibold pl-1 hover:underline"
                            style={{ color: '#fbbf24' }}>
                            +{items.length - 3} mais
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly summary ────────────────────────────────────────────────── */}
      {!loading && mesItens.length > 0 && (
        <div className="bg-white rounded-2xl px-5 py-4 flex items-center justify-between border border-gray-100 shadow-sm">
          <span className="text-sm text-gray-500 font-medium">
            {MESES_PT[currentMonth.getMonth()]}: {mesItens.length}{' '}
            {mesItens.length === 1 ? 'escala' : 'escalas'}
          </span>
          <span className="text-sm font-bold" style={{ color: '#431407' }}>
            {serv} {serv === 1 ? 'serviço' : 'serviços'} registrados
          </span>
        </div>
      )}

      {/* ── Side Drawer ────────────────────────────────────────────────────── */}
      {drawer && drawerDate && createPortal(
        <>
          <div
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawer(null)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-[1001] w-full max-w-sm bg-white shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.22s ease-out' }}>

            {/* Drawer header */}
            <div className="sidebar-gradient flex items-start justify-between px-5 py-4 flex-shrink-0 text-white">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs uppercase tracking-wider font-semibold mb-1"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {format(parseDate(drawerDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <h2 className="text-lg font-bold">
                  {drawer[0]?.escala.celebracao.periodo_liturgico ?? 'Celebração'}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {drawer.length} {drawer.length === 1 ? 'celebração' : 'celebrações'}
                </p>
              </div>
              <button onClick={() => setDrawer(null)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {drawer.map(item => {
                const cel = item.escala.celebracao
                const { color, label } = getCelebInfo(cel)
                const st = item.presenca?.status
                const isConf = confirmandoId === item.id

                const isConfirmed = item.status_confirmacao === 'confirmado'
                  || item.presenca?.status_confirmacao === 'confirmado'
                const isSubstituido = st === 'substituido'
                const [horH = 0, horM = 0] = cel.horario.split(':').map(Number)
                const celebStart = parseDate(cel.data)
                celebStart.setHours(horH, horM, 0, 0)
                const beforeStart = new Date() < celebStart

                const podeConfirmarEscala = !isConfirmed && (beforeStart || item.escala.presenca_aberta) && !isSubstituido
                const podeServir = item.escala.presenca_aberta && isConfirmed && st !== 'serviu' && !isSubstituido
                const podeJustificar = st === 'faltou' && !item.presenca?.justificativa_status

                return (
                  <div key={item.id} className="px-5 py-5 space-y-3">

                    {/* Type + flags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-sm"
                        style={{ background: color }}>
                        {label}
                      </span>
                      {cel.periodo_liturgico && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white/80"
                          style={{ background: 'rgba(28,20,69,0.65)' }}>
                          {cel.periodo_liturgico}
                        </span>
                      )}
                      {cel.possui_bispo && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                          style={{ background: '#8B5CF6' }}>
                          Bispo
                        </span>
                      )}
                      {podeServir && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 animate-pulse">
                          ● Janela aberta
                        </span>
                      )}
                    </div>

                    {/* Function card */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm btn-primary p-0">
                        ★
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                          Sua Função
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {item.funcao?.titulo ?? item.funcao_label ?? '—'}
                        </div>
                      </div>
                    </div>

                    {/* Time + local */}
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 flex-1">
                        <Clock size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">
                          {formatHorario(cel.horario)}
                        </span>
                      </div>
                      {cel.local && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 flex-1 min-w-0">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 truncate">{cel.local}</span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    {item.presenca?.justificativa_status === 'pendente' ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#F59E0B18', borderColor: '#F59E0B35' }}>
                        <Clock size={16} style={{ color: '#F59E0B' }} />
                        <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>Justificativa em análise</span>
                      </div>
                    ) : st ? (
                      <div>
                        <div className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            background: STATUS_COLOR[st] ? `${STATUS_COLOR[st]}18` : '#fffbeb',
                            borderColor: STATUS_COLOR[st] ? `${STATUS_COLOR[st]}35` : '#fde68a',
                          }}>
                          {st === 'serviu'
                            ? <CheckCircle2 size={16} style={{ color: STATUS_COLOR[st] }} />
                            : <AlertCircle size={16} style={{ color: STATUS_COLOR[st] ?? '#fbbf24' }} />
                          }
                          <span className="text-sm font-bold" style={{ color: STATUS_COLOR[st] ?? '#f59e0b' }}>
                            {STATUS_LABEL[st] ?? st}
                          </span>
                        </div>
                        {item.presenca?.justificativa_status === 'rejeitada' && (
                          <p className="text-xs text-red-500 mt-1.5 px-1">Sua justificativa foi recusada pelo admin.</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="text-sm text-gray-400">Presença não registrada</span>
                      </div>
                    )}

                    {/* Ações */}
                    {(podeConfirmarEscala || podeServir || podeJustificar) && (
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {podeConfirmarEscala && (
                          <button
                            onClick={() => handleConfirmarEscala(item)}
                            disabled={isConf}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: INDIGO, color: 'white', boxShadow: '0 4px 12px rgba(67,20,7,0.25)' }}>
                            <CheckCircle2 size={13} />
                            {isConf ? 'Salvando...' : 'Confirmar escala'}
                          </button>
                        )}
                        {podeServir && (
                          <button
                            onClick={() => handleServiu(item)}
                            disabled={isConf}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <CheckCircle2 size={13} />
                            {isConf ? 'Salvando...' : 'Marcar que servi'}
                          </button>
                        )}
                        {podeJustificar && (
                          <button
                            onClick={() => handleJustificar(item)}
                            disabled={isConf}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: '#F59E0B', color: 'white', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                            <AlertCircle size={13} />
                            {isConf ? 'Salvando...' : 'Justificar falta'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Observações */}
                    {cel.observacao && (
                      <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-800">
                        <strong>Celebração:</strong> {cel.observacao}
                      </div>
                    )}
                    {item.escala.observacao && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                        <strong>Escala:</strong> {item.escala.observacao}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </>,
        document.body
      )}

      <JustificativaModal
        isOpen={!!justItem}
        loading={salvandoJust}
        onConfirm={(obs) => justItem && handleJustificar(justItem, obs)}
        onCancel={() => setJustItem(null)}
      />
    </div>
  )
}

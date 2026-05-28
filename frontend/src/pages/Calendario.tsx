import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, X, Eye, Pencil, FileDown, Copy, MessageCircle,
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
         isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Celebracao, Escala } from '../types'
import { formatHorario } from '../lib/dateUtils'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'

const CELEBRATION_COLORS: Record<string, string> = {
  casamento:          'bg-pink-500',
  batismo:            'bg-cyan-500',
  crisma:             'bg-purple-500',
  celebracao_solene:  'bg-amber-500',
  celebracao_palavra: 'bg-green-600',
  celebracao_6h:      'bg-gray-500',
  noite:              'bg-blue-600',
  default:            'bg-wine-600',
}

function getCelebrationColor(c: Celebracao): string {
  if (c.casamento)          return CELEBRATION_COLORS.casamento
  if (c.batismo)            return CELEBRATION_COLORS.batismo
  if (c.crisma)             return CELEBRATION_COLORS.crisma
  if (c.celebracao_solene)  return CELEBRATION_COLORS.celebracao_solene
  if (c.celebracao_palavra) return CELEBRATION_COLORS.celebracao_palavra
  if (c.celebracao_6h)      return CELEBRATION_COLORS.celebracao_6h
  if (c.celebracao_noite)   return CELEBRATION_COLORS.noite
  return CELEBRATION_COLORS.default
}

function getCelebrationLabel(c: Celebracao): string {
  if (c.casamento)          return 'Casamento'
  if (c.batismo)            return 'Batismo'
  if (c.crisma)             return 'Crisma'
  if (c.celebracao_solene)  return 'Solene'
  if (c.celebracao_palavra) return 'Palavra'
  if (c.celebracao_6h)      return '6h'
  return 'Missa'
}

function safeParseDate(raw: string): Date {
  const s = raw.substring(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface DrawerState {
  celebracao: Celebracao
  escala: Escala | null
  loading: boolean
}

export default function Calendario() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [celebracoes, setCelebracoes] = useState<Celebracao[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  useEffect(() => {
    setLoading(true)
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')
    api.get<Celebracao[]>(`/celebracoes?data_inicio=${start}&data_fim=${end}`)
      .then(r => setCelebracoes(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Erro ao carregar celebrações'))
      .finally(() => setLoading(false))
  }, [currentMonth])

  async function openDrawer(c: Celebracao) {
    setDrawer({ celebracao: c, escala: null, loading: !!c.escala })
    if (c.escala?.id) {
      try {
        const r = await api.get<Escala>(`/escalas/${c.escala.id}`)
        setDrawer({ celebracao: c, escala: r.data, loading: false })
      } catch {
        setDrawer({ celebracao: c, escala: null, loading: false })
      }
    }
  }

  async function handlePdf(escalaId: number) {
    try {
      const r = await api.get(`/escalas/${escalaId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `escala-${escalaId}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Erro ao baixar PDF') }
  }

  // ── Copy entire month ──────────────────────────────────
  // ── Shared helper to abbreviate function labels ─────────────────────────
  function abreviarFuncao(label: string): string {
    const l = label.toLowerCase()
    if (l.includes('mestre') || (l.startsWith('cerimoni') && !l.includes('aux'))) return 'Cerimoniário'
    if (l.includes('auxiliar 1') || l.includes('primeiro') || l.includes('microfone')) return '1ª Aux'
    if (l.includes('auxiliar 2') || l.includes('segundo')  || l.includes('missal'))    return '2ª Aux'
    if (l.includes('auxiliar 3') || l.includes('terceiro') || l.includes('leitor'))    return '3ª Aux'
    if (l.includes('auxiliar 4') || l.includes('quarto')   || l.includes('prece'))     return '4ª Aux'
    if (l.includes('auxiliar 5') || l.includes('quinto')   || l.includes('turifer'))   return '5ª Aux'
    return label
  }

  const NOMENCLATURA_RODAPE = [
    '',
    '──────────────────────',
    'Nomenclatura do Serviço',
    '1ª AUX: Lado direito (microfone)',
    '2ª AUX: Lado esquerdo (missal)',
    '3ª AUX: Leitores',
    '4ª AUX: Preces, intenções e avisos',
    '5ª AUX: Turiferário (só à noite)',
    '',
    'Obs: Nas Missas da manhã, só vai até 4ª AUX,',
    'porque não há turíbulo nesses horários.',
  ]

  // ── Build the month text (shared by copy and WhatsApp) ───────────────────
  async function buildMonthText(): Promise<string | null> {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

    const r = await api.get<{
      celebracao?: { data: string; horario: string; periodo_liturgico: string }
      escala_itens?: { funcao_label?: string; funcao?: { titulo: string }; cerimoniario?: { nome: string } }[]
    }[]>(`/escalas?data_inicio=${start}&data_fim=${end}`).catch(() => null)

    if (!r?.data?.length) return null

    const grouped: Record<string, typeof r.data> = {}
    r.data.forEach(e => {
      const key = e.celebracao?.data?.substring(0, 10) ?? ''
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(e)
    })

    const monthName = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()
    const lines: string[] = [`📅 ESCALAS — ${monthName}`, '']

    Object.keys(grouped).sort().forEach(dateKey => {
      const d = dateKey.split('-').reverse().slice(0, 2).join('/')
      grouped[dateKey]
        .sort((a, b) => (a.celebracao?.horario ?? '').localeCompare(b.celebracao?.horario ?? ''))
        .forEach(e => {
          if (!e.celebracao) return
          const [hh, mm] = (e.celebracao.horario ?? '00:00').substring(0, 5).split(':').map(Number)
          const hStr = mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, '0')}`
          const periodo = e.celebracao.periodo_liturgico   // ← período após a data
          lines.push(`${d} — ${periodo}`)
          lines.push(`Missa às ${hStr}`)
          ;(e.escala_itens ?? []).forEach(item => {
            const label = item.funcao_label ?? item.funcao?.titulo ?? 'Função'
            const nome  = item.cerimoniario?.nome ?? 'A escalar'
            lines.push(`${abreviarFuncao(label)}: ${nome}`)
          })
          lines.push('')
        })
    })

    // Append nomenclature legend at the end
    NOMENCLATURA_RODAPE.forEach(l => lines.push(l))

    return lines.join('\n').trim()
  }

  async function copyMonth() {
    const text = await buildMonthText()
    if (!text) { toast.error('Nenhuma escala encontrada para este mês'); return }
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Escalas do mês copiadas!'))
      .catch(() => toast.error('Erro ao copiar'))
  }

  async function sendMonthWhatsApp() {
    const text = await buildMonthText()
    if (!text) { toast.error('Nenhuma escala para este mês'); return }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }
  // ───────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd })

  const byDate: Record<string, Celebracao[]> = {}
  celebracoes.forEach(c => {
    const key = c.data.substring(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(c)
  })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 rounded-full flex-shrink-0"
               style={{ background: 'linear-gradient(180deg,#f97316,#c2410c)' }} />
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
            className="px-3 py-1.5 text-sm font-semibold text-wine-700 bg-wine-50 border border-wine-200 rounded-lg hover:bg-wine-100 transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-bold text-gray-800 capitalize min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={copyMonth} className="btn-secondary text-sm px-3 py-2" title="Copiar mês inteiro">
            <Copy size={15} /> Copiar mês
          </button>
          <button onClick={sendMonthWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
                  title="Enviar mês pelo WhatsApp">
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button onClick={() => navigate('/celebracoes')} className="btn-primary text-sm px-4 py-2">
            <Plus size={16} /> Nova Celebração
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Missa', color: 'bg-wine-600' },
          { label: 'Noturna', color: 'bg-blue-600' },
          { label: 'Casamento', color: 'bg-pink-500' },
          { label: 'Batismo', color: 'bg-cyan-500' },
          { label: 'Crisma', color: 'bg-purple-500' },
          { label: 'Solene', color: 'bg-amber-500' },
          { label: 'Palavra', color: 'bg-green-600' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2 border-l border-gray-200 pl-3">
          <span className="text-green-600 font-bold">✓</span> Com escala
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100"
             style={{ background: 'linear-gradient(135deg,#7c2d12,#c2410c)' }}>
          {weekDays.map((day, i) => (
            <div key={day}
                 className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
                   i === 0 ? 'text-red-200' : i === 6 ? 'text-blue-200' : 'text-orange-100'
                 }`}>
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              const key      = format(day, 'yyyy-MM-dd')
              const dayCels  = (byDate[key] ?? []).sort((a, b) => a.horario.localeCompare(b.horario))
              const inMonth  = isSameMonth(day, currentMonth)
              const isT      = isToday(day)
              const isSun    = idx % 7 === 0
              const isSat    = idx % 7 === 6

              return (
                <div key={key}
                     className={`border-r border-b border-gray-100 p-1.5 min-h-[110px] flex flex-col transition-colors ${
                       !inMonth ? 'bg-gray-50/80' :
                       isSun || isSat ? 'bg-orange-50/40' : 'bg-white hover:bg-orange-50/20'
                     }`}>
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                      isT ? 'text-white shadow-sm' :
                      !inMonth ? 'text-gray-300' :
                      isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-800'
                    }`}
                    style={isT ? { background: 'linear-gradient(135deg,#ea580c,#7c2d12)' } : undefined}>
                      {format(day, 'd')}
                    </span>
                    {dayCels.length > 0 && inMonth && (
                      <span className="text-[9px] text-gray-400 font-medium">
                        {dayCels.length}×
                      </span>
                    )}
                  </div>

                  {/* Celebration pills */}
                  <div className="space-y-0.5 flex-1">
                    {dayCels.slice(0, 4).map(c => (
                      <button
                        key={c.id}
                        onClick={() => openDrawer(c)}
                        className={`w-full text-left px-1.5 py-1 rounded text-white text-[10px] font-semibold truncate flex items-center gap-1 hover:opacity-85 active:opacity-70 transition-opacity cursor-pointer ${getCelebrationColor(c)}`}
                        title={`${formatHorario(c.horario)} — ${c.periodo_liturgico}`}
                      >
                        <Clock size={8} className="flex-shrink-0 opacity-80" />
                        <span className="font-bold">{formatHorario(c.horario)}</span>
                        <span className="truncate opacity-90 ml-0.5">{getCelebrationLabel(c)}</span>
                        {c.escala && <span className="ml-auto text-green-200 flex-shrink-0 font-bold">✓</span>}
                      </button>
                    ))}
                    {dayCels.length > 4 && (
                      <button
                        onClick={() => openDrawer(dayCels[4])}
                        className="text-[10px] text-wine-600 font-semibold pl-1 hover:underline"
                      >
                        +{dayCels.length - 4} mais
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Side Drawer (Portal → renders at document.body, bypasses overflow constraints) ── */}
      {drawer && createPortal(
        <>
          <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
               onClick={() => setDrawer(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-[1001] w-full max-w-sm bg-white shadow-2xl flex flex-col"
               style={{ animation: 'slideInRight 0.22s ease-out' }}>

            {/* Drawer header */}
            <div className="flex items-start justify-between px-5 py-4 flex-shrink-0 sidebar-gradient text-white">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-orange-200/70 text-xs uppercase tracking-wider font-semibold mb-1">
                  {format(safeParseDate(drawer.celebracao.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <h2 className="text-lg font-bold truncate">{drawer.celebracao.periodo_liturgico}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="opacity-70" />
                    <span className="text-sm font-bold">{formatHorario(drawer.celebracao.horario)}</span>
                  </div>
                  <span className="text-orange-300/50">·</span>
                  <span className="text-sm text-orange-100/80">{getCelebrationLabel(drawer.celebracao)}</span>
                </div>
              </div>
              <button onClick={() => setDrawer(null)}
                      className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Flags */}
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-1.5">
              {drawer.celebracao.celebracao_noite  && <Badge variant="blue"   size="sm">Noturna</Badge>}
              {drawer.celebracao.possui_bispo       && <Badge variant="purple" size="sm">Bispo</Badge>}
              {drawer.celebracao.casamento          && <Badge variant="gold"   size="sm">Casamento</Badge>}
              {drawer.celebracao.batismo            && <Badge variant="blue"   size="sm">Batismo</Badge>}
              {drawer.celebracao.crisma             && <Badge variant="purple" size="sm">Crisma</Badge>}
              {drawer.celebracao.celebracao_solene  && <Badge variant="gold"   size="sm">Solene</Badge>}
              {drawer.celebracao.celebracao_palavra && <Badge variant="green"  size="sm">Palavra</Badge>}
              {!drawer.celebracao.escala && <Badge variant="red" size="sm">Sem escala</Badge>}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {drawer.loading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner size="lg" />
                </div>
              ) : drawer.escala ? (
                <>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={12} className="text-wine-500" />
                    Equipe Escalada
                  </h3>
                  <div className="space-y-2">
                    {(drawer.escala.escala_itens ?? drawer.escala.itens ?? [])
                      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                      .map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-gray-400 font-medium truncate uppercase tracking-wide">
                              {item.funcao_label ?? item.funcao?.titulo ?? 'Função'}
                            </div>
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {item.cerimoniario?.nome ?? <span className="text-gray-400 italic font-normal">A escalar</span>}
                            </div>
                          </div>
                          {item.presenca && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                              item.presenca.status === 'serviu'      ? 'bg-green-100 text-green-700' :
                              item.presenca.status === 'faltou'      ? 'bg-red-100 text-red-700' :
                              item.presenca.status === 'substituido' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {item.presenca.status === 'serviu' ? 'Serviu' :
                               item.presenca.status === 'faltou' ? 'Faltou' :
                               item.presenca.status === 'substituido' ? 'Subst.' :
                               'Just.'}
                            </span>
                          )}
                        </div>
                      ))}
                    {(drawer.escala.escala_itens ?? drawer.escala.itens ?? []).length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">Escala sem funções cadastradas</p>
                    )}
                  </div>
                  {drawer.escala.observacao && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                      <strong>Obs:</strong> {drawer.escala.observacao}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-3">
                    <Calendar size={28} className="text-wine-400" />
                  </div>
                  <p className="font-semibold text-gray-600">Sem escala criada</p>
                  <p className="text-sm text-gray-400 mt-1">Crie uma escala para esta celebração</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50/50">
              {drawer.escala ? (
                <>
                  <button onClick={() => { setDrawer(null); navigate(`/escalas/${drawer.escala!.id}`) }}
                          className="flex-1 btn-secondary text-sm py-2">
                    <Eye size={14} /> Ver
                  </button>
                  <button onClick={() => { setDrawer(null); navigate(`/escalas/${drawer.escala!.id}/editar`) }}
                          className="flex-1 btn-primary text-sm py-2">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => handlePdf(drawer.escala!.id)}
                          className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                          title="PDF">
                    <FileDown size={15} />
                  </button>
                </>
              ) : (
                <button onClick={() => { setDrawer(null); navigate(`/escalas/nova?celebracao_id=${drawer.celebracao.id}`) }}
                        className="flex-1 btn-primary text-sm py-2">
                  <Plus size={14} /> Criar Escala
                </button>
              )}
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
    </div>
  )
}

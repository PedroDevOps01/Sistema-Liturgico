import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle2, XCircle, AlertCircle, HelpCircle, CalendarDays, MapPin, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { parseDate, formatHorario, parseDateParts } from '../../lib/dateUtils'
import { isFuncaoMestre } from '../../lib/funcaoUtils'
import { formatPeriodoParaExibicao } from '../../lib/liturgico'
import JustificativaModal from '../../components/common/JustificativaModal'
import ScanQrCodeModal from '../../components/common/ScanQrCodeModal'

const THEME_DARK = '#431407'
const THEME_MID  = '#fbbf24'

interface Presenca  { id: number; status: string; status_confirmacao?: string | null; justificativa_status?: 'pendente' | 'aprovada' | 'rejeitada' | null }
interface Funcao    { titulo: string }
interface Celebracao { data: string; horario: string; periodo_liturgico?: string; local?: string; descricao?: string }
interface EscalaNested { id: number; celebracao: Celebracao; presenca_aberta: boolean; observacao?: string }
interface EscalaItem   { id: number; status_confirmacao?: string | null; escala: EscalaNested; funcao: Funcao | null; funcao_label?: string; presenca: Presenca | null }

type Periodo = 'futuras' | 'passadas' | 'todas'

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  serviu:      { label: 'Serviu',      color: '#10B981', bg: '#10B98112', icon: <CheckCircle2 size={13} /> },
  faltou:      { label: 'Faltou',      color: '#EF4444', bg: '#EF444412', icon: <XCircle      size={13} /> },
  justificado: { label: 'Justificado', color: '#F59E0B', bg: '#F59E0B12', icon: <AlertCircle  size={13} /> },
  substituido: { label: 'Substituído', color: '#8B5CF6', bg: '#8B5CF612', icon: <HelpCircle   size={13} /> },
}

function safeDate(raw: string): Date {
  try { return parseDate(raw) } catch { return new Date() }
}

export default function MembroEscalas() {
  const [periodo, setPeriodo]             = useState<Periodo>('futuras')
  const [itens, setItens]                 = useState<EscalaItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [justItem, setJustItem]           = useState<EscalaItem | null>(null)
  const [scanItem, setScanItem]           = useState<EscalaItem | null>(null)
  const hoje = new Date().toISOString().split('T')[0]

  function carregar(p: Periodo) {
    setLoading(true)
    membroApi.get<EscalaItem[]>('/escalas', { params: { periodo: p } })
      .then(r => setItens(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Erro ao carregar escalas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar(periodo) }, [periodo])

  async function handleConfirmarPresenca(item: EscalaItem) {
    setConfirmandoId(item.id)
    try {
      await membroApi.post(`/escala-itens/${item.id}/confirmar`, {})
      toast.success('✅ Presença confirmada!')
      carregar(periodo)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao confirmar presença')
    } finally { setConfirmandoId(null) }
  }

  async function handleServiu(item: EscalaItem, qrcode?: string) {
    setConfirmandoId(item.id)
    try {
      await membroApi.put(`/escala-itens/${item.id}/presenca`, { status: 'serviu', qrcode: qrcode ?? null })
      toast.success('✅ Presença registrada!')
      carregar(periodo)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar presença')
    } finally { setConfirmandoId(null) }
  }

  function handleServirClick(item: EscalaItem) {
    // Mestre já provou presença ao exibir o QR Code — não escaneia o próprio.
    if (isFuncaoMestre(item.funcao?.titulo ?? item.funcao_label)) {
      handleServiu(item)
    } else {
      setScanItem(item)
    }
  }

  async function handleJustificar(item: EscalaItem, observacao?: string) {
    setConfirmandoId(item.id)
    try {
      await membroApi.put(`/escala-itens/${item.id}/presenca`, { status: 'justificado', observacao: observacao ?? null })
      toast.success('⚠️ Justificativa registrada.')
      setJustItem(null)
      carregar(periodo)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao justificar')
    } finally { setConfirmandoId(null) }
  }

  const serviu      = itens.filter(i => i.presenca?.status === 'serviu').length
  const faltou      = itens.filter(i => i.presenca?.status === 'faltou').length
  const justificado = itens.filter(i => i.presenca?.status === 'justificado').length
  const semStatus   = itens.filter(i => !i.presenca).length
  const comStatus   = serviu + faltou + justificado
  const pct         = comStatus > 0 ? Math.round((serviu / comStatus) * 100) : null

  return (
    <>
      <style>{`
        @keyframes mpFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .esc-card { animation: mpFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="space-y-5">

        {/* Header */}
        <div className="esc-card">
          <h1 className="text-2xl font-bold text-gray-900">Minhas Escalas</h1>
          <p className="text-gray-400 text-sm mt-0.5">Histórico e próximas celebrações</p>
        </div>

        {/* Stats bar */}
        {itens.length > 0 && (
          <div className="esc-card card p-5">
            <div className="flex flex-wrap items-center gap-5">
              {/* Percentage + bar */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Índice de Presença</span>
                  {pct !== null && (
                    <span className="text-2xl font-extrabold"
                      style={{ color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}>
                      {pct}%
                    </span>
                  )}
                </div>
                {comStatus > 0 && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-px">
                    {serviu      > 0 && <div style={{ flex: serviu,      background: '#10B981' }} className="h-full" />}
                    {justificado > 0 && <div style={{ flex: justificado, background: '#F59E0B' }} className="h-full" />}
                    {faltou      > 0 && <div style={{ flex: faltou,      background: '#EF4444' }} className="h-full" />}
                  </div>
                )}
                <p className="text-xs text-gray-400">{comStatus} de {itens.length} escalas com registro</p>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-gray-100 flex-shrink-0" />

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Serviu',      n: serviu,      color: '#10B981' },
                  { label: 'Faltou',      n: faltou,      color: '#EF4444' },
                  { label: 'Justificado', n: justificado, color: '#F59E0B' },
                  { label: 'Pendente',    n: semStatus,   color: '#9CA3AF' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="ml-auto text-xs font-bold" style={{ color: r.n > 0 ? r.color : '#D1D5DB' }}>{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="esc-card flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#F3F4F6' }}>
          {(['futuras', 'passadas', 'todas'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: periodo === p ? 'white' : 'transparent',
                color:      periodo === p ? THEME_DARK  : '#6B7280',
                boxShadow:  periodo === p ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              {p === 'futuras' ? 'Futuras' : p === 'passadas' ? 'Passadas' : 'Todas'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${THEME_MID}40`, borderTopColor: THEME_MID }} />
          </div>
        ) : !itens.length ? (
          <div className="card p-14 text-center">
            <CalendarDays size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">Nenhuma escala encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {itens.map((item, idx) => {
              const d            = item.escala.celebracao.data
              const dayStr       = d.substring(0, 10)
              const passada      = dayStr < hoje
              const janelaAberta = item.escala.presenca_aberta
              const isConfirmando = confirmandoId === item.id
              const st           = item.presenca?.status
              const stCfg        = st ? STATUS[st] : null
              const isExpanded   = expandedId === item.id
              const parts        = parseDateParts(d)

              // Confirmação: via link (item.status_confirmacao) ou manual (presenca.status_confirmacao)
              const isConfirmed = item.status_confirmacao === 'confirmado' || item.presenca?.status_confirmacao === 'confirmado'
              // "antes do início" = celebração ainda não começou (data+hora futura)
              const [horH = 0, horM = 0] = item.escala.celebracao.horario.split(':').map(Number)
              const celebStart = safeDate(d)
              celebStart.setHours(horH, horM, 0, 0)
              const beforeStart = new Date() < celebStart

              const isSubstituido = st === 'substituido'
              // Confirmar escala: antes da celebração OU durante a janela (membro presente mas não havia confirmado)
              const podeConfirmarEscala = !isConfirmed && (beforeStart || janelaAberta) && !isSubstituido
              // Justificar = explicar porque faltou → só após a falta ser registrada, e só uma vez
              const podeJustificar = st === 'faltou' && !item.presenca?.justificativa_status
              // Marcar que servi → janela aberta + confirmado
              const podeServir = janelaAberta && isConfirmed && st !== 'serviu' && !isSubstituido

              return (
                <div key={item.id} className="esc-card card overflow-hidden transition-all duration-200"
                  style={{
                    animationDelay: `${idx * 0.03}s`,
                    borderLeft: `3px solid ${stCfg ? stCfg.color : passada ? '#E5E7EB' : THEME_MID}`,
                  }}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Date block */}
                      <div className="flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center text-center"
                        style={{ background: passada ? '#F3F4F6' : THEME_DARK, color: passada ? '#9CA3AF' : 'white' }}>
                        <span className="text-[9px] font-bold uppercase leading-none">{parts.weekday}</span>
                        <span className="text-xl font-black leading-tight">{parts.day}</span>
                        <span className="text-[9px] uppercase leading-none opacity-70">{parts.month}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {format(safeDate(d), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {formatHorario(item.escala.celebracao.horario)}
                          {(item.funcao?.titulo ?? item.funcao_label) && ` · ${item.funcao?.titulo ?? item.funcao_label}`}
                        </p>
                        {item.escala.celebracao.local && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {item.escala.celebracao.local}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.presenca?.justificativa_status === 'pendente' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: '#F59E0B15', color: '#F59E0B' }}>
                              <Clock size={13} /> Justificativa em análise
                            </span>
                          ) : stCfg ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: stCfg.bg, color: stCfg.color }}>
                              {stCfg.icon} {stCfg.label}
                            </span>
                          ) : passada ? (
                            <span className="text-xs text-gray-400 font-medium px-2 py-0.5 rounded-full bg-gray-100">
                              Sem registro
                            </span>
                          ) : !isConfirmed ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                              Não confirmou
                            </span>
                          ) : null}

                          {isConfirmed && !stCfg && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-green-700 bg-green-50">
                              ✓ Confirmado
                            </span>
                          )}
                          {janelaAberta && isConfirmed && st !== 'serviu' && !isSubstituido && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse text-emerald-700 bg-emerald-50">
                              ● Janela aberta
                            </span>
                          )}

                          {item.escala.celebracao.periodo_liturgico && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {formatPeriodoParaExibicao(item.escala.celebracao.periodo_liturgico, item.escala.celebracao.data)}
                            </span>
                          )}
                        </div>
                        {item.presenca?.justificativa_status === 'rejeitada' && (
                          <p className="text-xs text-red-500 mt-1.5">Sua justificativa foi recusada pelo admin.</p>
                        )}
                      </div>

                      {/* Expand toggle */}
                      {(item.escala.celebracao.descricao || item.escala.observacao) && (
                        <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-100"
                          style={{ color: '#9CA3AF' }}>
                          <ChevronDown size={16} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                      )}
                    </div>

                    {/* Ações do membro */}
                    {(podeConfirmarEscala || podeJustificar || podeServir) && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {/* Confirmar escala — "vou estar lá" — antes da celebração, ainda não confirmado */}
                        {podeConfirmarEscala && (
                          <button onClick={() => handleConfirmarPresenca(item)} disabled={isConfirmando}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: THEME_DARK, color: 'white', boxShadow: '0 4px 12px rgba(67,20,7,0.25)' }}>
                            <CheckCircle2 size={13} />
                            {isConfirmando ? 'Salvando...' : 'Confirmar escala'}
                          </button>
                        )}
                        {/* Justificar — apenas quando já há registro de falta */}
                        {podeJustificar && (
                          <button onClick={() => setJustItem(item)} disabled={isConfirmando}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: '#F59E0B', color: 'white', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                            <AlertCircle size={13} />
                            Justificar falta
                          </button>
                        )}
                        {/* Marcar que serviu — janela aberta, confirmado */}
                        {podeServir && (
                          <button onClick={() => handleServirClick(item)} disabled={isConfirmando}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ background: '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <CheckCircle2 size={13} />
                            {isConfirmando ? 'Salvando...' : 'Marcar que servi'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
                      {item.escala.celebracao.descricao && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observação da Celebração</p>
                          <p className="text-sm text-gray-600">{item.escala.celebracao.descricao}</p>
                        </div>
                      )}
                      {item.escala.observacao && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Obs. da Escala</p>
                          <p className="text-sm text-amber-500">{item.escala.observacao}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <JustificativaModal
        isOpen={!!justItem}
        loading={justItem !== null && confirmandoId === justItem.id}
        onConfirm={(obs) => justItem && handleJustificar(justItem, obs)}
        onCancel={() => setJustItem(null)}
      />

      <ScanQrCodeModal
        isOpen={!!scanItem}
        onCancel={() => setScanItem(null)}
        onScan={(code) => {
          const item = scanItem
          setScanItem(null)
          if (item) handleServiu(item, code)
        }}
      />
    </>
  )
}

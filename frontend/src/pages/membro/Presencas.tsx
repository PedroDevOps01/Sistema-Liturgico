import { useCallback, useEffect, useRef, useState } from 'react'
import { format, differenceInSeconds } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Clock, CheckCircle2, XCircle, AlertCircle, Users,
  Lock, Unlock, RefreshCw, ShieldCheck, Timer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { parseDate, formatHorario } from '../../lib/dateUtils'
import JustificativaModal from '../../components/common/JustificativaModal'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface PresencaStatus { status: string | null }
interface MembroCel      { id: number; nome: string; foto_base64?: string | null }

interface ItemCel {
  id: number
  funcao_label?: string
  funcao: { titulo: string } | null
  cerimoniario: MembroCel | null
  presenca: PresencaStatus | null
}

interface EscalaCel {
  id: number
  presenca_aberta: boolean
  presenca_aberta_em: string | null
  presenca_fechada_em: string | null
  celebracao: {
    data: string
    horario: string
    periodo_liturgico?: string
  }
  todos_itens: ItemCel[]
}

interface PresencaDia {
  meu_item_id: number
  pode_controlar: boolean
  minha_presenca: { status: string } | null
  minha_funcao: string
  escala: EscalaCel
}

const STATUS_CFG = {
  serviu:      { label: 'Confirmei presença', color: '#10B981', bg: '#10B98115' },
  faltou:      { label: 'Faltou',             color: '#EF4444', bg: '#EF444415' },
  justificado: { label: 'Justificado',        color: '#F59E0B', bg: '#F59E0B15' },
  substituido: { label: 'Substituído',        color: '#8B5CF6', bg: '#8B5CF615' },
}

function Avatar({ nome, foto, size = 32 }: { nome: string; foto?: string | null; size?: number }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return foto ? (
    <img src={foto} alt={nome} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#431407' }}>
      {ini}
    </div>
  )
}

const JANELA_MINUTOS = 60

function tempoRestante(abertaEm: string | null): { mm: number; ss: number; pct: number } | null {
  if (!abertaEm) return null
  const totalSeg = JANELA_MINUTOS * 60
  const decorrido = differenceInSeconds(new Date(), new Date(abertaEm))
  const restante  = Math.max(0, totalSeg - decorrido)
  return {
    mm:  Math.floor(restante / 60),
    ss:  restante % 60,
    pct: Math.round((restante / totalSeg) * 100),
  }
}

export default function MembroPresencas() {
  const [dados, setDados]       = useState<PresencaDia[]>([])
  const [loading, setLoading]   = useState(true)
  const [acao, setAcao]         = useState<Record<number, boolean>>({})
  const [now, setNow]           = useState(new Date())
  const [justItemId, setJustItemId] = useState<number | null>(null)
  const [salvandoJust, setSalvandoJust] = useState(false)
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  const carregar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await membroApi.get<PresencaDia[]>('/presencas-dia')
      setDados(Array.isArray(r.data) ? r.data : [])
    } catch {
      if (!silent) toast.error('Erro ao carregar presenças')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    pollRef.current = setInterval(() => carregar(true), 20_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [carregar])

  // Tick a cada segundo para atualizar o countdown da janela
  useEffect(() => {
    const temAlgumAberta = dados.some(d => d.escala.presenca_aberta && d.escala.presenca_aberta_em)
    if (temAlgumAberta) {
      tickRef.current = setInterval(() => setNow(new Date()), 1_000)
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [dados])

  async function handleAbrir(escalaId: number) {
    setAcao(a => ({ ...a, [escalaId]: true }))
    try {
      await membroApi.post(`/escalas/${escalaId}/presenca/abrir`)
      toast.success('Janela aberta! Os membros já podem confirmar presença.')
      carregar(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao abrir janela')
    } finally {
      setAcao(a => ({ ...a, [escalaId]: false }))
    }
  }

  async function handleFechar(escalaId: number) {
    setAcao(a => ({ ...a, [escalaId]: true }))
    try {
      await membroApi.post(`/escalas/${escalaId}/presenca/fechar`)
      toast.success('Janela fechada. Faltas automáticas aplicadas.')
      carregar(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao fechar janela')
    } finally {
      setAcao(a => ({ ...a, [escalaId]: false }))
    }
  }

  async function handleMarcar(itemId: number, status: 'serviu' | 'justificado', observacao?: string) {
    if (status === 'justificado' && observacao === undefined) {
      setJustItemId(itemId)
      return
    }
    if (status === 'justificado') setSalvandoJust(true)
    try {
      await membroApi.put(`/escala-itens/${itemId}/presenca`, { status, observacao: observacao ?? null })
      toast.success(status === 'serviu' ? '✅ Presença confirmada!' : '⚠️ Justificativa registrada.')
      setJustItemId(null)
      carregar(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar presença')
    } finally {
      setSalvandoJust(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes prFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pr-card { animation: prFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="space-y-5">

        {/* Header */}
        <div className="pr-card flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presenças de Hoje</h1>
            <p className="text-gray-400 text-sm mt-0.5 capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => carregar()}
            className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100">
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 260 }}>
            <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          </div>

        ) : !dados.length ? (
          <div className="pr-card card p-16 text-center">
            <Users size={44} className="mx-auto mb-4 text-gray-200" />
            <p className="font-semibold text-gray-500">Sem celebrações hoje</p>
            <p className="text-sm text-gray-400 mt-1">
              Você não está escalado para nenhuma celebração hoje.
            </p>
          </div>

        ) : (
          dados.map((d, idx) => {
            const cel    = d.escala.celebracao
            const aberta = d.escala.presenca_aberta
            const encerrada = !aberta && !!d.escala.presenca_fechada_em
            const isAcao = !!acao[d.escala.id]
            const stCfg  = d.minha_presenca?.status
              ? STATUS_CFG[d.minha_presenca.status as keyof typeof STATUS_CFG]
              : null

            const respondidos = d.escala.todos_itens.filter(i => i.presenca?.status).length
            const total       = d.escala.todos_itens.length

            return (
              <div key={d.escala.id} className="pr-card card overflow-hidden"
                style={{ animationDelay: `${idx * 0.08}s` }}>

                {/* Celebration header */}
                <div className="sidebar-gradient px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-base leading-tight">
                        {format(parseDate(cel.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-white/60 text-sm">
                          <Clock size={11} />
                          {formatHorario(cel.horario)}
                        </div>
                        {cel.periodo_liturgico && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ background: `${GOLD}cc`, color: DARK }}>
                            {cel.periodo_liturgico}
                          </span>
                        )}
                        {d.pode_controlar && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                            <ShieldCheck size={9} />
                            Mestre
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">Sua função</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{d.minha_funcao}</p>
                      <p className="text-white/40 text-[10px] mt-1">{respondidos}/{total} responderam</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5">

                  {/* Window status + mestre controls */}
                  <div className="rounded-xl p-4 border"
                    style={{
                      background: aberta ? '#10B98108' : encerrada ? '#F9FAFB' : '#F9FAFB',
                      borderColor: aberta ? '#10B98140' : '#E5E7EB',
                    }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: aberta ? '#10B98115' : '#F3F4F6',
                          }}>
                          {aberta
                            ? <Unlock size={16} style={{ color: '#10B981' }} />
                            : <Lock   size={16} className="text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-bold"
                            style={{ color: aberta ? '#10B981' : '#6B7280' }}>
                            {aberta ? 'Janela aberta' : encerrada ? 'Janela encerrada' : 'Janela fechada'}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {aberta && d.escala.presenca_aberta_em
                              ? `Aberta às ${format(new Date(d.escala.presenca_aberta_em), 'HH:mm')}`
                              : encerrada && d.escala.presenca_fechada_em
                              ? `Encerrada às ${format(new Date(d.escala.presenca_fechada_em), 'HH:mm')}`
                              : !d.pode_controlar
                              ? 'Aguardando o mestre abrir'
                              : 'Abre após o início da celebração'}
                          </p>
                        </div>
                      </div>

                      {d.pode_controlar && (
                        !aberta ? (
                          <button
                            onClick={() => handleAbrir(d.escala.id)}
                            disabled={isAcao}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
                            style={{ background: '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <Unlock size={13} />
                            {isAcao ? 'Abrindo...' : 'Abrir Janela'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFechar(d.escala.id)}
                            disabled={isAcao}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
                            style={{ background: '#EF4444', color: 'white', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }}>
                            <Lock size={13} />
                            {isAcao ? 'Fechando...' : 'Fechar Janela'}
                          </button>
                        )
                      )}
                    </div>

                    {/* Countdown da janela */}
                    {aberta && d.escala.presenca_aberta_em && (() => {
                      const t = tempoRestante(d.escala.presenca_aberta_em)
                      if (!t) return null
                      const urgente = t.mm < 10
                      const cor = urgente ? '#EF4444' : '#10B981'
                      void now // força re-render pelo tick
                      return (
                        <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: `${cor}30` }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Timer size={12} style={{ color: cor }} />
                              <span className="text-[11px] font-bold" style={{ color: cor }}>
                                Encerra em {String(t.mm).padStart(2,'0')}:{String(t.ss).padStart(2,'0')}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">Fecha automaticamente em {JANELA_MINUTOS} min</span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${t.pct}%`, background: cor }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* My presence */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-2.5">
                      Minha Presença
                    </p>
                    {stCfg ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit"
                        style={{ background: stCfg.bg, border: `1px solid ${stCfg.color}30` }}>
                        {d.minha_presenca?.status === 'serviu'      && <CheckCircle2 size={15} style={{ color: stCfg.color }} />}
                        {d.minha_presenca?.status === 'faltou'      && <XCircle      size={15} style={{ color: stCfg.color }} />}
                        {d.minha_presenca?.status === 'justificado' && <AlertCircle  size={15} style={{ color: stCfg.color }} />}
                        <span className="text-sm font-bold" style={{ color: stCfg.color }}>
                          {stCfg.label}
                        </span>
                      </div>
                    ) : aberta ? (
                      <div className="flex gap-2.5 flex-wrap">
                        <button
                          onClick={() => handleMarcar(d.meu_item_id, 'serviu')}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                          <CheckCircle2 size={14} />
                          Confirmei presença
                        </button>
                        <button
                          onClick={() => handleMarcar(d.meu_item_id, 'justificado')}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: GOLD, color: DARK, boxShadow: '0 4px 12px rgba(251,191,36,0.25)' }}>
                          <AlertCircle size={14} />
                          Justificar falta
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        {encerrada
                          ? 'Janela encerrada — presença não registrada recebe falta automática.'
                          : 'Aguardando o mestre abrir a janela para registrar sua presença.'}
                      </p>
                    )}
                  </div>

                  {/* Team list */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">
                        Equipe
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${GOLD}20`, color: '#92400e' }}>
                        {respondidos}/{total} confirmados
                      </span>
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3 flex gap-px">
                        {d.escala.todos_itens.filter(i => i.presenca?.status === 'serviu').length > 0 && (
                          <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                            style={{ width: `${(d.escala.todos_itens.filter(i => i.presenca?.status === 'serviu').length / total) * 100}%` }} />
                        )}
                        {d.escala.todos_itens.filter(i => i.presenca?.status === 'justificado').length > 0 && (
                          <div className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${(d.escala.todos_itens.filter(i => i.presenca?.status === 'justificado').length / total) * 100}%` }} />
                        )}
                        {d.escala.todos_itens.filter(i => i.presenca?.status === 'faltou').length > 0 && (
                          <div className="h-full bg-red-500 rounded-r-full transition-all duration-500"
                            style={{ width: `${(d.escala.todos_itens.filter(i => i.presenca?.status === 'faltou').length / total) * 100}%` }} />
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {d.escala.todos_itens.map(item => {
                        const isMe     = item.id === d.meu_item_id
                        const funcLabel = item.funcao?.titulo ?? item.funcao_label ?? '—'
                        const st       = item.presenca?.status
                        const stc      = st ? STATUS_CFG[st as keyof typeof STATUS_CFG] : null

                        return (
                          <div key={item.id}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors"
                            style={{
                              background: isMe ? `${GOLD}10` : '#F9FAFB',
                              border: isMe ? `1px solid ${GOLD}35` : '1px solid transparent',
                            }}>

                            {item.cerimoniario
                              ? <Avatar nome={item.cerimoniario.nome} foto={item.cerimoniario.foto_base64} size={34} />
                              : <div className="w-[34px] h-[34px] rounded-full bg-gray-200 flex-shrink-0" />
                            }

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                                {item.cerimoniario?.nome ?? '—'}
                                {isMe && (
                                  <span className="ml-1.5 text-[10px] font-bold" style={{ color: GOLD }}>
                                    (você)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{funcLabel}</p>
                            </div>

                            <div className="flex-shrink-0">
                              {stc ? (
                                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                                  style={{ background: stc.bg, color: stc.color }}>
                                  {st === 'serviu'      && <CheckCircle2 size={11} />}
                                  {st === 'faltou'      && <XCircle      size={11} />}
                                  {st === 'justificado' && <AlertCircle  size={11} />}
                                  {stc.label}
                                </span>
                              ) : aberta ? (
                                <span className="text-[11px] text-gray-400 font-medium animate-pulse">
                                  ● Aguardando
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-300 font-medium">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <JustificativaModal
        isOpen={justItemId !== null}
        loading={salvandoJust}
        onConfirm={(obs) => justItemId !== null && handleMarcar(justItemId, 'justificado', obs)}
        onCancel={() => setJustItemId(null)}
      />
    </>
  )
}

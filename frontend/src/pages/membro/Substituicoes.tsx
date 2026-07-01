import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeftRight, Clock, MapPin, X, Check, Hand, Users, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { getMembroUser } from '../../lib/membroAuth'
import { parseDate, formatHorario } from '../../lib/dateUtils'

const GOLD = '#fbbf24'
const DARK = '#431407'

// ── Types ───────────────────────────────────────────────────────────────────

interface Celebracao { data: string; horario: string; periodo_liturgico?: string; local?: string }
interface EscalaNested { celebracao: Celebracao }
interface PedidoSub { id: number; motivo: string | null; resolvido: boolean; voluntario_cerimoniario_id: number | null; voluntario?: { id: number; nome: string } | null }
interface Presenca { status: string; substituto?: { id: number; nome: string } | null }
interface EscalaItem {
  id: number
  funcao_label?: string
  funcao: { titulo: string } | null
  escala: EscalaNested
  pedido_substituto: PedidoSub | null
  presenca: Presenca | null
}

interface PedidoAberto {
  id: number
  motivo: string | null
  voluntario_cerimoniario_id: number | null
  voluntario: { id: number; nome: string } | null
  escala_item: {
    id: number
    funcao_label?: string
    funcao: { titulo: string } | null
    cerimoniario: { id: number; nome: string }
    escala: EscalaNested
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DateBadge({ data, danger }: { data: string; danger?: boolean }) {
  const d = parseDate(data)
  return (
    <div className="flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center text-center"
      style={{ background: danger ? '#FEF2F2' : `${GOLD}15`, color: danger ? '#EF4444' : DARK }}>
      <span className="text-[8px] font-bold uppercase leading-none">{format(d, 'EEE', { locale: ptBR })}</span>
      <span className="text-lg font-extrabold leading-tight">{format(d, 'dd')}</span>
      <span className="text-[8px] uppercase leading-none opacity-70">{format(d, 'MMM', { locale: ptBR })}</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function MembroSubstituicoes() {
  const user = getMembroUser()

  // Minhas escalas
  const [itens, setItens] = useState<EscalaItem[]>([])
  const [loadingMeus, setLoadingMeus] = useState(true)
  const [pedindo, setPedindo] = useState<number | null>(null)
  const [motivoMap, setMotivoMap] = useState<Record<number, string>>({})
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({})

  // Pedidos abertos de outros + minhas confirmadas
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoAberto[]>([])
  const [minhasConfirmadas, setMinhasConfirmadas] = useState<PedidoAberto[]>([])
  const [loadingAbertos, setLoadingAbertos] = useState(true)
  const [voluntariando, setVoluntariando] = useState<number | null>(null)

  // Aba ativa
  const [aba, setAba] = useState<'meus' | 'abertos'>('abertos')

  const carregarMeus = () => {
    setLoadingMeus(true)
    membroApi.get<EscalaItem[]>('/substituicoes')
      .then(r => setItens(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoadingMeus(false))
  }

  const carregarAbertos = () => {
    setLoadingAbertos(true)
    membroApi.get<{ abertos: PedidoAberto[]; minhas_confirmadas: PedidoAberto[] }>('/pedidos-abertos')
      .then(r => {
        const d = r.data as unknown as { abertos?: PedidoAberto[]; minhas_confirmadas?: PedidoAberto[] }
        setPedidosAbertos(Array.isArray(d?.abertos) ? d.abertos : [])
        setMinhasConfirmadas(Array.isArray(d?.minhas_confirmadas) ? d.minhas_confirmadas : [])
      })
      .finally(() => setLoadingAbertos(false))
  }

  useEffect(() => { carregarMeus(); carregarAbertos() }, [])

  // ── Pedir / cancelar substituto ──────────────────────────────────────────

  async function handlePedir(item: EscalaItem) {
    setPedindo(item.id)
    try {
      await membroApi.post(`/escala-itens/${item.id}/pedir-substituto`, { motivo: motivoMap[item.id] ?? null })
      toast.success('Pedido de substituto registrado.')
      setOpenMap(m => ({ ...m, [item.id]: false }))
      carregarMeus(); carregarAbertos()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar pedido')
    } finally { setPedindo(null) }
  }

  async function handleCancelar(item: EscalaItem) {
    setPedindo(item.id)
    try {
      await membroApi.delete(`/escala-itens/${item.id}/pedir-substituto`)
      toast.success('Pedido cancelado.')
      carregarMeus(); carregarAbertos()
    } catch { toast.error('Erro ao cancelar') }
    finally { setPedindo(null) }
  }

  // ── Voluntariar ──────────────────────────────────────────────────────────

  async function handleVoluntariar(pedido: PedidoAberto) {
    setVoluntariando(pedido.id)
    try {
      await membroApi.post(`/escala-itens/${pedido.escala_item.id}/voluntariar`)
      toast.success('Você se voluntariou! O coordenador será notificado.')
      carregarAbertos()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar voluntário')
    } finally { setVoluntariando(null) }
  }

  async function handleCancelarVoluntario(pedido: PedidoAberto) {
    setVoluntariando(pedido.id)
    try {
      await membroApi.delete(`/escala-itens/${pedido.escala_item.id}/voluntariar`)
      toast.success('Voluntário removido.')
      carregarAbertos()
    } catch { toast.error('Erro ao remover voluntário') }
    finally { setVoluntariando(null) }
  }

  const euSouVoluntario = (p: PedidoAberto) => p.voluntario_cerimoniario_id === user?.id

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowLeftRight size={22} style={{ color: GOLD }} /> Substituições
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Gerencie pedidos de substituto</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { key: 'abertos', label: 'Pedidos Abertos', count: pedidosAbertos.length },
          { key: 'meus',    label: 'Minhas Escalas',  count: null                  },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setAba(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              aba === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: '#EF4444', color: 'white' }}>
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Aba: Pedidos Abertos ─────────────────────────────────────────── */}
      {aba === 'abertos' && (
        loadingAbertos ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          </div>
        ) : !pedidosAbertos.length ? (
          <div className="card p-14 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">Nenhum pedido aberto</p>
            <p className="text-sm text-gray-400 mt-1">Quando alguém precisar de substituto aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosAbertos.map((p, idx) => {
              const cel = p.escala_item.escala.celebracao
              const funcLabel = p.escala_item.funcao?.titulo ?? p.escala_item.funcao_label ?? '—'
              const euVoluntario = euSouVoluntario(p)
              const temVoluntario = !!p.voluntario_cerimoniario_id
              const isLoading = voluntariando === p.id

              return (
                <div key={p.id} className="card overflow-hidden"
                  style={{
                    animationDelay: `${idx * 0.04}s`,
                    borderLeft: euVoluntario ? '4px solid #10B981' : temVoluntario ? '4px solid #6366F1' : `4px solid ${GOLD}`,
                  }}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <DateBadge data={cel.data} />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {format(parseDate(cel.data), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {formatHorario(cel.horario)}
                          {cel.local && <><MapPin size={10} className="ml-1" />{cel.local}</>}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${GOLD}20`, color: '#f59e0b' }}>
                            {funcLabel}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {p.escala_item.cerimoniario.nome}
                          </span>
                        </div>

                        {p.motivo && (
                          <p className="mt-1.5 text-xs text-gray-400 italic">"{p.motivo}"</p>
                        )}

                        {euVoluntario && (
                          <p className="mt-1.5 text-xs font-semibold text-green-600 flex items-center gap-1">
                            <Check size={11} /> Você está como voluntário
                          </p>
                        )}
                        {temVoluntario && !euVoluntario && (
                          <p className="mt-1.5 text-xs font-semibold text-indigo-500 flex items-center gap-1">
                            <Hand size={11} /> {p.voluntario?.nome} se voluntariou
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {euVoluntario ? (
                          <button onClick={() => handleCancelarVoluntario(p)} disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                            style={{ background: '#F0FDF4', color: '#16A34A' }}>
                            <X size={12} /> Desistir
                          </button>
                        ) : (
                          <button onClick={() => handleVoluntariar(p)} disabled={isLoading || (temVoluntario && !euVoluntario)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                            style={{
                              background: temVoluntario ? '#F3F4F6' : `${GOLD}20`,
                              color: temVoluntario ? '#9CA3AF' : '#f59e0b',
                            }}>
                            <Hand size={12} />
                            {isLoading ? '...' : temVoluntario ? 'Ocupado' : 'Substituir'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {minhasConfirmadas.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1 mb-2 flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-green-500" /> Minhas Substituições Confirmadas
                </p>
                {minhasConfirmadas.map((p, idx) => {
                  const cel = p.escala_item.escala.celebracao
                  const funcLabel = p.escala_item.funcao?.titulo ?? p.escala_item.funcao_label ?? '—'
                  return (
                    <div key={p.id} className="card overflow-hidden mb-2"
                      style={{ animationDelay: `${idx * 0.04}s`, borderLeft: '4px solid #10B981' }}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <DateBadge data={cel.data} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              {format(parseDate(cel.data), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {formatHorario(cel.horario)}
                              {cel.local && <><MapPin size={10} className="ml-1" />{cel.local}</>}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${GOLD}20`, color: '#f59e0b' }}>
                                {funcLabel}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                substituindo {p.escala_item.cerimoniario.nome}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs font-semibold text-green-600 flex items-center gap-1">
                              <Check size={11} /> Você está confirmado nesta escala
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Aba: Minhas Escalas ──────────────────────────────────────────── */}
      {aba === 'meus' && (
        loadingMeus ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          </div>
        ) : !itens.length ? (
          <div className="card p-14 text-center">
            <ArrowLeftRight size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">Sem escalas futuras</p>
            <p className="text-sm text-gray-400 mt-1">Você não tem escalas futuras registradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map((item, idx) => {
              const cel = item.escala.celebracao
              const funcLabel = item.funcao?.titulo ?? item.funcao_label ?? '—'
              const temPedido = !!item.pedido_substituto && !item.pedido_substituto.resolvido
              const foiSubstituido = item.presenca?.status === 'substituido'
              const substitutoNome = item.presenca?.substituto?.nome
              const voluntarioNome = item.pedido_substituto?.voluntario?.nome
              const isOpen = !!openMap[item.id]
              const isLoading = pedindo === item.id

              return (
                <div key={item.id} className="card overflow-hidden"
                  style={{
                    animationDelay: `${idx * 0.04}s`,
                    borderLeft: foiSubstituido
                      ? '4px solid #10B981'
                      : temPedido
                        ? '4px solid #EF4444'
                        : '4px solid #E5E7EB',
                  }}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <DateBadge data={cel.data} danger={temPedido && !foiSubstituido} />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {format(parseDate(cel.data), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {formatHorario(cel.horario)}
                          {cel.local && <><MapPin size={10} className="ml-1" />{cel.local}</>}
                        </p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${GOLD}20`, color: '#f59e0b' }}>
                          {funcLabel}
                        </span>

                        {foiSubstituido && (
                          <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                            <Check size={11} /> Substituído por {substitutoNome ?? 'outro membro'}
                          </p>
                        )}

                        {!foiSubstituido && temPedido && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                            <ArrowLeftRight size={11} />
                            Substituto solicitado
                            {item.pedido_substituto?.motivo && (
                              <span className="font-normal text-gray-400 ml-1">— {item.pedido_substituto.motivo}</span>
                            )}
                          </div>
                        )}

                        {!foiSubstituido && temPedido && item.pedido_substituto?.voluntario_cerimoniario_id && (
                          <p className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1">
                            <Hand size={11} /> Voluntário: {voluntarioNome ?? 'Alguém se voluntariou'}
                          </p>
                        )}
                      </div>

                      {foiSubstituido ? (
                        <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: '#F0FDF4', color: '#16A34A' }}>
                          Resolvido
                        </span>
                      ) : temPedido ? (
                        <button onClick={() => handleCancelar(item)} disabled={isLoading}
                          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                          style={{ background: '#FEF2F2', color: '#EF4444' }}>
                          <X size={12} /> Cancelar
                        </button>
                      ) : (
                        <button onClick={() => setOpenMap(m => ({ ...m, [item.id]: !isOpen }))}
                          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: isOpen ? '#F3F4F6' : `${GOLD}20`, color: isOpen ? '#6B7280' : '#f59e0b' }}>
                          <ArrowLeftRight size={12} /> Precisar
                        </button>
                      )}
                    </div>

                    {isOpen && !temPedido && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <input type="text" className="input-field text-sm"
                          placeholder="Motivo do pedido (opcional)"
                          value={motivoMap[item.id] ?? ''}
                          onChange={e => setMotivoMap(m => ({ ...m, [item.id]: e.target.value }))}
                          maxLength={500} />
                        <button onClick={() => handlePedir(item)} disabled={isLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                          style={{ background: '#EF4444', color: 'white' }}>
                          <Check size={13} /> {isLoading ? 'Enviando...' : 'Confirmar pedido'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

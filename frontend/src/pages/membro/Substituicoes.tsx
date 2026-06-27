import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeftRight, Clock, MapPin, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { parseDate, formatHorario } from '../../lib/dateUtils'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface Celebracao { data: string; horario: string; periodo_liturgico?: string; local?: string }
interface EscalaNested { celebracao: Celebracao }
interface PedidoSub { id: number; motivo: string | null; resolvido: boolean }
interface EscalaItem {
  id: number
  funcao_label?: string
  funcao: { titulo: string } | null
  escala: EscalaNested
  pedido_substituto: PedidoSub | null
}

export default function MembroSubstituicoes() {
  const [itens, setItens] = useState<EscalaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pedindo, setPedindo] = useState<number | null>(null)
  const [motivoMap, setMotivoMap] = useState<Record<number, string>>({})
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({})

  const carregar = () => {
    setLoading(true)
    membroApi.get<EscalaItem[]>('/substituicoes')
      .then(r => setItens(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function handlePedir(item: EscalaItem) {
    setPedindo(item.id)
    const motivo = motivoMap[item.id] ?? ''
    try {
      await membroApi.post(`/escala-itens/${item.id}/pedir-substituto`, { motivo: motivo || null })
      toast.success('Pedido de substituto registrado.')
      setOpenMap(m => ({ ...m, [item.id]: false }))
      carregar()
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
      carregar()
    } catch { toast.error('Erro ao cancelar') }
    finally { setPedindo(null) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowLeftRight size={22} style={{ color: GOLD }} /> Substituições
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Solicite substituto para escalas futuras</p>
      </div>

      {loading ? (
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
            const isOpen = !!openMap[item.id]
            const isLoading = pedindo === item.id

            return (
              <div key={item.id} className="card overflow-hidden"
                style={{
                  animationDelay: `${idx * 0.04}s`,
                  borderLeft: temPedido ? '4px solid #EF4444' : '4px solid #E5E7EB',
                }}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center text-center"
                      style={{ background: temPedido ? '#FEF2F2' : `${GOLD}15`, color: temPedido ? '#EF4444' : DARK }}>
                      <span className="text-[8px] font-bold uppercase leading-none">
                        {format(parseDate(cel.data), 'EEE', { locale: ptBR })}
                      </span>
                      <span className="text-lg font-extrabold leading-tight">
                        {format(parseDate(cel.data), 'dd')}
                      </span>
                      <span className="text-[8px] uppercase leading-none opacity-70">
                        {format(parseDate(cel.data), 'MMM', { locale: ptBR })}
                      </span>
                    </div>

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

                      {temPedido && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                          <ArrowLeftRight size={11} />
                          Substituto solicitado
                          {item.pedido_substituto?.motivo && (
                            <span className="font-normal text-gray-400 ml-1">— {item.pedido_substituto.motivo}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {temPedido ? (
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
      )}
    </div>
  )
}

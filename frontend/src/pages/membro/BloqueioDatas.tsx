import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarOff, Plus, X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface PeriodoBloqueado { id: number; data: string; data_fim: string; motivo: string | null }

export default function MembroBloqueioDatas() {
  const [lista, setLista]       = useState<PeriodoBloqueado[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [motivo, setMotivo]         = useState('')
  const [salvando, setSalvando]     = useState(false)

  const today  = new Date().toISOString().split('T')[0]
  const maxDate = format(addDays(new Date(), 365), 'yyyy-MM-dd')

  const carregar = () => {
    setLoading(true)
    membroApi.get<PeriodoBloqueado[]>('/datas-bloqueadas')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function handleBloquear() {
    if (!dataInicio) return toast.error('Selecione a data de início')
    if (!dataFim)    return toast.error('Selecione a data de fim')
    if (dataFim < dataInicio) return toast.error('A data fim deve ser igual ou posterior ao início')
    setSalvando(true)
    try {
      await membroApi.post('/datas-bloqueadas', { data: dataInicio, data_fim: dataFim, motivo: motivo || null })
      toast.success('Período bloqueado!')
      setDataInicio(''); setDataFim(''); setMotivo(''); setShowForm(false)
      carregar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao bloquear período')
    } finally { setSalvando(false) }
  }

  async function handleDesbloquear(id: number) {
    try {
      await membroApi.delete(`/datas-bloqueadas/${id}`)
      toast.success('Período removido.')
      setLista(l => l.filter(d => d.id !== id))
    } catch { toast.error('Erro ao remover período') }
  }

  function formatPeriodo(d: PeriodoBloqueado) {
    const inicio = new Date(d.data.substring(0, 10) + 'T00:00:00')
    const fim    = new Date((d.data_fim ?? d.data).substring(0, 10) + 'T00:00:00')
    const sameDay = d.data.substring(0, 10) === (d.data_fim ?? d.data).substring(0, 10)
    if (sameDay) return format(inicio, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    return `${format(inicio, "dd/MM/yyyy")} → ${format(fim, "dd/MM/yyyy")}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock size={22} style={{ color: GOLD }} /> Períodos Indisponíveis
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Marque períodos em que não poderá servir</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: showForm ? '#F3F4F6' : GOLD, color: showForm ? '#6B7280' : DARK }}>
          <Plus size={15} /> Bloquear Período
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4" style={{ borderTop: `3px solid ${GOLD}` }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Novo Período Bloqueado</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data de início</label>
              <input type="date" className="input-field" min={today} max={maxDate}
                value={dataInicio} onChange={e => { setDataInicio(e.target.value); if (!dataFim) setDataFim(e.target.value) }} />
            </div>
            <div>
              <label className="label">Data de fim</label>
              <input type="date" className="input-field" min={dataInicio || today} max={maxDate}
                value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Motivo (opcional)</label>
              <input type="text" className="input-field" placeholder="Ex: Viagem, trabalho, férias..."
                value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={200} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleBloquear} disabled={salvando}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: GOLD, color: DARK }}>
              {salvando ? 'Salvando...' : 'Confirmar Bloqueio'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 180 }}>
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
        </div>
      ) : !lista.length ? (
        <div className="card p-14 text-center">
          <CalendarOff size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Nenhum período bloqueado</p>
          <p className="text-sm text-gray-400 mt-1">Use o botão acima para marcar períodos em que não poderá servir.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              {lista.length} período{lista.length !== 1 ? 's' : ''} bloqueado{lista.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {lista.map(d => {
              const inicio = new Date(d.data.substring(0, 10) + 'T00:00:00')
              const fim    = new Date((d.data_fim ?? d.data).substring(0, 10) + 'T00:00:00')
              const sameDay = d.data.substring(0, 10) === (d.data_fim ?? d.data).substring(0, 10)
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                      style={{ background: `${GOLD}15`, color: DARK }}>
                      {sameDay ? (
                        <>
                          <span className="text-[9px] font-bold uppercase leading-none">
                            {format(inicio, 'MMM', { locale: ptBR })}
                          </span>
                          <span className="text-base font-extrabold leading-tight">
                            {format(inicio, 'dd')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-bold leading-none">{format(inicio, 'dd/MM')}</span>
                          <span className="text-[9px] font-bold leading-none opacity-50">↓</span>
                          <span className="text-[9px] font-bold leading-none">{format(fim, 'dd/MM')}</span>
                        </>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                        {formatPeriodo(d)}
                      </p>
                      {d.motivo && <p className="text-xs text-gray-400 mt-0.5 truncate">{d.motivo}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDesbloquear(d.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

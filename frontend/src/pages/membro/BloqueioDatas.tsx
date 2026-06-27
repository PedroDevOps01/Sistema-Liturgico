import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarOff, Plus, X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface DataBloqueada { id: number; data: string; motivo: string | null }

export default function MembroBloqueioDatas() {
  const [lista, setLista]       = useState<DataBloqueada[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [novaData, setNovaData] = useState('')
  const [motivo, setMotivo]     = useState('')
  const [salvando, setSalvando] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const minDate = today
  const maxDate = format(addDays(new Date(), 365), 'yyyy-MM-dd')

  const carregar = () => {
    setLoading(true)
    membroApi.get<DataBloqueada[]>('/datas-bloqueadas')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function handleBloquear() {
    if (!novaData) return toast.error('Selecione uma data')
    setSalvando(true)
    try {
      await membroApi.post('/datas-bloqueadas', { data: novaData, motivo: motivo || null })
      toast.success('Data bloqueada!')
      setNovaData(''); setMotivo(''); setShowForm(false)
      carregar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao bloquear data')
    } finally { setSalvando(false) }
  }

  async function handleDesbloquear(id: number) {
    try {
      await membroApi.delete(`/datas-bloqueadas/${id}`)
      toast.success('Data desbloqueada.')
      setLista(l => l.filter(d => d.id !== id))
    } catch { toast.error('Erro ao desbloquear') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock size={22} style={{ color: GOLD }} /> Datas Indisponíveis
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Marque datas específicas em que não poderá servir</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: showForm ? '#F3F4F6' : GOLD, color: showForm ? '#6B7280' : DARK }}>
          <Plus size={15} /> Bloquear Data
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4" style={{ borderTop: `3px solid ${GOLD}` }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Nova Data Bloqueada</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data</label>
              <input type="date" className="input-field" min={minDate} max={maxDate}
                value={novaData} onChange={e => setNovaData(e.target.value)} />
            </div>
            <div>
              <label className="label">Motivo (opcional)</label>
              <input type="text" className="input-field" placeholder="Ex: Viagem, trabalho..."
                value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={200} />
            </div>
          </div>
          <div className="flex gap-2">
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
          <p className="font-semibold text-gray-500">Nenhuma data bloqueada</p>
          <p className="text-sm text-gray-400 mt-1">Use o botão acima para marcar datas em que não poderá servir.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">
              {lista.length} data{lista.length !== 1 ? 's' : ''} bloqueada{lista.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {lista.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: `${GOLD}15`, color: DARK }}>
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {format(new Date(d.data.substring(0, 10) + 'T00:00:00'), 'MMM', { locale: ptBR })}
                    </span>
                    <span className="text-base font-extrabold leading-tight">
                      {format(new Date(d.data.substring(0, 10) + 'T00:00:00'), 'dd')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {format(new Date(d.data.substring(0, 10) + 'T00:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {d.motivo && <p className="text-xs text-gray-400 mt-0.5">{d.motivo}</p>}
                  </div>
                </div>
                <button onClick={() => handleDesbloquear(d.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

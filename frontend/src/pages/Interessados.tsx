import { useCallback, useEffect, useState } from 'react'
import { Heart, Phone, Mail, Trash2, CheckCheck, MessageCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '../lib/api'
import type { Interessado } from '../types'
import PageHeader from '../components/common/PageHeader'
import ConfirmDialog from '../components/common/ConfirmDialog'

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

export default function Interessados() {
  const [lista, setLista]           = useState<Interessado[]>([])
  const [loading, setLoading]       = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Interessado | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<Interessado[]>('/interessados')
      setLista(r.data)
    } catch {
      toast.error('Erro ao carregar interessados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleLido(item: Interessado) {
    try {
      const r = await api.patch<Interessado>(`/interessados/${item.id}/marcar-lido`)
      setLista(prev => prev.map(i => i.id === item.id ? r.data : i))
    } catch { toast.error('Erro ao atualizar') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/interessados/${deleteTarget.id}`)
      setLista(prev => prev.filter(i => i.id !== deleteTarget.id))
      toast.success('Removido')
    } catch { toast.error('Erro ao remover') }
    finally { setDeleteTarget(null) }
  }

  function openWhatsApp(tel: string) {
    const num = tel.replace(/\D/g, '')
    const full = num.startsWith('55') ? num : `55${num}`
    window.open(`https://wa.me/${full}`, '_blank')
  }

  const naoLidos = lista.filter(i => !i.lido).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interessados"
        subtitle={`${lista.length} inscrições${naoLidos > 0 ? ` · ${naoLidos} não lidas` : ''}`}
        action={
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <RefreshCw size={15} /> Atualizar
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Heart size={36} className="opacity-20" />
          <p className="text-sm">Nenhum interessado ainda.</p>
          <p className="text-xs text-gray-300">Os formulários enviados pelo portal aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl border-2 bg-white p-5 transition-all ${
                item.lido ? 'border-gray-100' : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{item.nome}</p>
                    {!item.lido && (
                      <span className="flex-shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        NOVO
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mb-2 text-sm text-gray-500">
                    {item.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} /> {maskPhone(item.telefone)}
                      </span>
                    )}
                    {item.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={13} /> {item.email}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {item.mensagem && (
                    <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 border border-gray-100">
                      "{item.mensagem}"
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-col gap-2">
                  {item.telefone && (
                    <button
                      onClick={() => openWhatsApp(item.telefone!)}
                      className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => toggleLido(item)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      item.lido
                        ? 'border-gray-200 text-gray-400 hover:border-gray-300'
                        : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
                    }`}
                    title={item.lido ? 'Marcar como não lido' : 'Marcar como lido'}
                  >
                    <CheckCheck size={13} /> {item.lido ? 'Lido' : 'Marcar lido'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="flex items-center justify-center rounded-xl border border-red-100 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover interessado"
        message={`Tem certeza que deseja remover "${deleteTarget?.nome}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

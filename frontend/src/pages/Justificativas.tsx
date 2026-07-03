import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw, ClipboardCheck, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { formatDataShort, formatHorario } from '../lib/dateUtils'

interface Justificativa {
  id: number
  observacao: string | null
  justificativa_status: 'pendente' | 'aprovada' | 'rejeitada'
  justificativa_analisada_em: string | null
  updated_at: string
  escala_item: {
    id: number
    funcao_label?: string | null
    funcao: { titulo: string } | null
    cerimoniario: { id: number; nome: string; foto_base64?: string | null } | null
    escala: {
      id: number
      celebracao: { data: string; horario: string; periodo_liturgico?: string } | null
    } | null
  } | null
  analisado_por: { id: number; nome: string } | null
}

const TABS = [
  { key: 'pendente', label: 'Pendentes' },
  { key: 'aprovada', label: 'Aprovadas' },
  { key: 'rejeitada', label: 'Rejeitadas' },
  { key: 'todas', label: 'Todas' },
] as const

export default function Justificativas() {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('pendente')
  const [lista, setLista] = useState<Justificativa[]>([])
  const [loading, setLoading] = useState(true)
  const [acao, setAcao] = useState<Record<number, boolean>>({})
  const [rejeitarAlvo, setRejeitarAlvo] = useState<Justificativa | null>(null)

  const load = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const r = await api.get<Justificativa[]>('/justificativas', { params: { status } })
      setLista(r.data)
    } catch {
      toast.error('Erro ao carregar justificativas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  function aplicarAtualizacao(id: number, atualizado: Partial<Justificativa>) {
    setLista(prev => {
      const merged = prev.map(j => (j.id === id ? { ...j, ...atualizado } : j))
      return tab === 'todas' ? merged : merged.filter(j => j.justificativa_status === tab)
    })
  }

  async function aprovar(item: Justificativa) {
    setAcao(a => ({ ...a, [item.id]: true }))
    try {
      const r = await api.put(`/justificativas/${item.id}/aprovar`)
      toast.success('Justificativa aprovada.')
      aplicarAtualizacao(item.id, r.data.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao aprovar justificativa')
    } finally {
      setAcao(a => ({ ...a, [item.id]: false }))
    }
  }

  async function rejeitar() {
    if (!rejeitarAlvo) return
    const item = rejeitarAlvo
    setAcao(a => ({ ...a, [item.id]: true }))
    try {
      const r = await api.put(`/justificativas/${item.id}/rejeitar`)
      toast.success('Justificativa rejeitada — falta mantida.')
      aplicarAtualizacao(item.id, r.data.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao rejeitar justificativa')
    } finally {
      setAcao(a => ({ ...a, [item.id]: false }))
      setRejeitarAlvo(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Justificativas"
        subtitle="Analise as faltas justificadas pelos membros no portal"
        action={
          <button onClick={() => load(tab)} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <RefreshCw size={15} /> Atualizar
          </button>
        }
      />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <ClipboardCheck size={36} className="opacity-20" />
          <p className="text-sm">Nenhuma justificativa {tab === 'pendente' ? 'pendente' : 'nessa categoria'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(item => {
            const cel = item.escala_item?.escala?.celebracao
            const nome = item.escala_item?.cerimoniario?.nome ?? 'Cerimoniário removido'
            const funcao = item.escala_item?.funcao_label ?? item.escala_item?.funcao?.titulo ?? '—'
            const isAcao = !!acao[item.id]

            return (
              <div key={item.id} className="rounded-2xl border-2 border-gray-100 bg-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900">{nome}</p>
                      <span className="text-xs text-gray-400">· {funcao}</span>
                      {item.justificativa_status === 'aprovada' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">APROVADA</span>
                      )}
                      {item.justificativa_status === 'rejeitada' && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">REJEITADA</span>
                      )}
                      {item.justificativa_status === 'pendente' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock size={10} /> PENDENTE
                        </span>
                      )}
                    </div>

                    {cel && (
                      <p className="text-xs text-gray-400 mb-2">
                        {cel.periodo_liturgico ? `${cel.periodo_liturgico} · ` : ''}
                        {formatDataShort(cel.data)} às {formatHorario(cel.horario)}
                      </p>
                    )}

                    {item.observacao && (
                      <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 border border-gray-100">
                        "{item.observacao}"
                      </p>
                    )}

                    {item.justificativa_status !== 'pendente' && item.analisado_por && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        Analisado por {item.analisado_por.nome}
                        {item.justificativa_analisada_em ? ` em ${formatDataShort(item.justificativa_analisada_em)}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    {item.justificativa_status !== 'aprovada' && (
                      <button
                        onClick={() => aprovar(item)}
                        disabled={isAcao}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} /> Aprovar
                      </button>
                    )}
                    {item.justificativa_status !== 'rejeitada' && (
                      <button
                        onClick={() => setRejeitarAlvo(item)}
                        disabled={isAcao}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <XCircle size={13} /> Rejeitar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!rejeitarAlvo}
        title="Rejeitar justificativa"
        message={`A falta de "${rejeitarAlvo?.escala_item?.cerimoniario?.nome ?? ''}" será mantida como não justificada. Continuar?`}
        onConfirm={rejeitar}
        onCancel={() => setRejeitarAlvo(null)}
      />
    </div>
  )
}

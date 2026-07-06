import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BookOpen, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  MapPin, Clock, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { formatPeriodoParaExibicao } from '../../lib/liturgico'
import JustificativaModal from '../../components/common/JustificativaModal'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface PresencaTreinamento { status: string | null; observacao?: string | null }
interface TreinamentoMembro {
  id: number
  data: string
  horario: string
  tema: string
  local?: string
  funcoes?: string[] | null
  periodo_liturgico?: string
  observacao?: string
  minha_presenca: PresencaTreinamento | null
}

const STATUS_CFG = {
  presente: { label: 'Presente', color: '#10B981', bg: '#10B98115' },
  ausente: { label: 'Ausente', color: '#EF4444', bg: '#EF444415' },
  justificado: { label: 'Justificado', color: '#F59E0B', bg: '#F59E0B15' },
}

export default function MembroTreinamentos() {
  const [lista, setLista] = useState<TreinamentoMembro[]>([])
  const [loading, setLoading] = useState(true)
  const [marcando, setMarcando] = useState<number | null>(null)
  const [justId, setJustId] = useState<number | null>(null)

  const carregar = () => {
    setLoading(true)
    membroApi.get<TreinamentoMembro[]>('/treinamentos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Erro ao carregar treinamentos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const hoje = new Date().toISOString().split('T')[0]

  async function marcar(treinamentoId: number, status: 'presente' | 'ausente' | 'justificado', observacao?: string) {
    setMarcando(treinamentoId)
    try {
      await membroApi.put(`/treinamentos/${treinamentoId}/presenca`, { status, observacao: observacao ?? null })
      toast.success(
        status === 'presente' ? '✅ Presença confirmada!' :
          status === 'justificado' ? '⚠️ Justificativa registrada.' :
            'Ausência registrada.'
      )
      setJustId(null)
      carregar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao registrar')
    } finally { setMarcando(null) }
  }

  const proximos = lista.filter(t => t.data.substring(0, 10) >= hoje).reverse()
  const anteriores = lista.filter(t => t.data.substring(0, 10) < hoje)

  function TreinamentoCard({ t }: { t: TreinamentoMembro }) {
    const passado = t.data.substring(0, 10) < hoje
    const stCfg = t.minha_presenca?.status ? STATUS_CFG[t.minha_presenca.status as keyof typeof STATUS_CFG] : null
    const isM = marcando === t.id

    return (
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="sidebar-gradient px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-bold text-sm capitalize">
                {format(new Date(t.data.substring(0, 10) + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-white/60 text-xs">
                  <Clock size={10} />{t.horario.substring(0, 5)}
                </span>
                {t.local && (
                  <span className="flex items-center gap-1 text-white/60 text-xs">
                    <MapPin size={10} />{t.local}
                  </span>
                )}
              </div>
            </div>
            {t.periodo_liturgico && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${GOLD}cc`, color: DARK }}>
                {formatPeriodoParaExibicao(t.periodo_liturgico, t.data)}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">{t.tema}</p>

          {/* Funções destinatárias */}
          {t.funcoes && t.funcoes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag size={11} className="text-gray-400 flex-shrink-0" />
              {t.funcoes.map(f => (
                <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${GOLD}18`, color: '#f59e0b' }}>
                  {f}
                </span>
              ))}
            </div>
          )}

          {t.observacao && <p className="text-xs text-gray-500 italic">{t.observacao}</p>}

          {/* Status / botões */}
          {stCfg ? (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
                style={{ background: stCfg.bg, border: `1px solid ${stCfg.color}30` }}>
                {t.minha_presenca?.status === 'presente' && <CheckCircle2 size={13} style={{ color: stCfg.color }} />}
                {t.minha_presenca?.status === 'ausente' && <XCircle size={13} style={{ color: stCfg.color }} />}
                {t.minha_presenca?.status === 'justificado' && <AlertCircle size={13} style={{ color: stCfg.color }} />}
                <span className="text-xs font-bold" style={{ color: stCfg.color }}>{stCfg.label}</span>
              </div>
              {t.minha_presenca?.observacao && (
                <p className="text-xs text-gray-400 mt-1.5 italic">"{t.minha_presenca.observacao}"</p>
              )}
            </div>
          ) : !passado ? (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => marcar(t.id, 'presente')} disabled={!!isM}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#10B981', color: 'white' }}>
                <CheckCircle2 size={12} /> {isM ? '...' : 'Estarei presente'}
              </button>
              <button onClick={() => setJustId(t.id)} disabled={!!isM}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: GOLD, color: DARK }}>
                <AlertCircle size={12} /> Justificar
              </button>
              <button onClick={() => marcar(t.id, 'ausente')} disabled={!!isM}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                <XCircle size={12} /> {isM ? '...' : 'Não estarei'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Sem registro de presença.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen size={22} style={{ color: GOLD }} /> Treinamentos
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Treinamentos e formações do ministério</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
        </div>
      ) : !lista.length ? (
        <div className="card p-14 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Nenhum treinamento registrado</p>
        </div>
      ) : (
        <div className="space-y-5">
          {proximos.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Próximos</p>
              {proximos.map(t => <TreinamentoCard key={t.id} t={t} />)}
            </div>
          )}
          {anteriores.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Anteriores</p>
              {anteriores.map(t => <TreinamentoCard key={t.id} t={t} />)}
            </div>
          )}
        </div>
      )}

      <JustificativaModal
        isOpen={justId !== null}
        loading={justId !== null && marcando === justId}
        onConfirm={(obs) => justId !== null && marcar(justId, 'justificado', obs)}
        onCancel={() => setJustId(null)}
      />
    </div>
  )
}

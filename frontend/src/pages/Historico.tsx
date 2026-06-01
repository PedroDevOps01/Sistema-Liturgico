import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Search, X, Calendar, Clock,
  CheckCircle2, XCircle, RotateCcw, AlertCircle, MinusCircle,
  ChevronDown, ChevronUp, Eye, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { getPeriodoBadgeVariant } from '../lib/liturgico'
import { parseDate } from '../lib/dateUtils'
import type { Celebracao, EscalaItem } from '../types'
import Badge from '../components/common/Badge'
import PageHeader from '../components/common/PageHeader'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { parseDateParts, formatHorario } from '../lib/dateUtils'

// ── Types ────────────────────────────────────────────────────────────────────

interface HistoricoEscala {
  id: number
  celebracao_id: number
  celebracao: Celebracao
  escala_itens: EscalaItem[]
  observacao?: string
}

interface Stats {
  total_celebracoes: number
  total_escalados: number
  serviu: number
  faltou: number
  substituido: number
  taxa_presenca: number | null
}

interface HistoricoData {
  escalas: HistoricoEscala[]
  stats: Stats
  periodo: { inicio: string; fim: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DateBox({ data }: { data: string }) {
  const { day, month, weekday } = parseDateParts(data)
  return (
    <div className="flex-shrink-0 w-11 h-11 flex flex-col items-center justify-center bg-wine-900 text-white rounded-lg">
      <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">{weekday}</span>
      <span className="text-base font-bold leading-tight">{day}</span>
      <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">{month}</span>
    </div>
  )
}

function StatusIcon({ status }: { status: string | null | undefined }) {
  if (status === 'serviu')      return <CheckCircle2 size={14} className="text-green-600" />
  if (status === 'faltou')      return <XCircle       size={14} className="text-red-500" />
  if (status === 'substituido') return <RotateCcw     size={14} className="text-amber-500" />
  if (status === 'justificado') return <AlertCircle   size={14} className="text-yellow-500" />
  return <MinusCircle size={14} className="text-gray-300" />
}

function statusLabel(status: string | null | undefined): string {
  if (status === 'serviu')      return 'Serviu'
  if (status === 'faltou')      return 'Faltou'
  if (status === 'substituido') return 'Substituído'
  if (status === 'justificado') return 'Justificado'
  return '—'
}

function statusColor(status: string | null | undefined): string {
  if (status === 'serviu')      return 'text-green-700 bg-green-50'
  if (status === 'faltou')      return 'text-red-600   bg-red-50'
  if (status === 'substituido') return 'text-amber-700 bg-amber-50'
  if (status === 'justificado') return 'text-yellow-700 bg-yellow-50'
  return 'text-gray-400 bg-gray-50'
}

function CelebFlags({ c }: { c: Celebracao }) {
  const flags: { label: string; variant: 'blue'|'purple'|'orange'|'green'|'wine'|'gold'|'red'|'gray' }[] = []
  if (c.celebracao_noite)    flags.push({ label: 'Noite',         variant: 'blue' })
  if (c.possui_bispo)        flags.push({ label: 'Bispo',         variant: 'purple' })
  if (c.celebracao_solene)   flags.push({ label: 'Solene',        variant: 'wine' })
  if (c.celebracao_palavra)  flags.push({ label: 'Palavra',       variant: 'green' })
  if (c.celebracao_6h)       flags.push({ label: '6h',            variant: 'orange' })
  if (c.casamento)           flags.push({ label: 'Casamento',     variant: 'gold' })
  if (c.batismo)             flags.push({ label: 'Batismo',       variant: 'blue' })
  if (c.crisma)              flags.push({ label: 'Crisma',        variant: 'purple' })
  if (c.primeira_eucaristia) flags.push({ label: '1ª Eucaristia', variant: 'gold' })
  if (c.adoracao_santissimo) flags.push({ label: 'Adoração',      variant: 'purple' })
  if (c.procissao)           flags.push({ label: 'Procissão',     variant: 'blue' })
  if (c.via_sacra)           flags.push({ label: 'Via-Sacra',     variant: 'wine' })
  if (c.exequias)            flags.push({ label: 'Exéquias',      variant: 'gray' })
  if (c.vigilia_pascal)      flags.push({ label: 'Vigília Pascal', variant: 'gold' })
  if (c.paixao_senhor)       flags.push({ label: 'Paixão',        variant: 'red' })
  if (c.ordenacao)           flags.push({ label: 'Ordenação',     variant: 'purple' })
  if (flags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(({ label, variant }) => (
        <Badge key={label} variant={variant} size="sm">{label}</Badge>
      ))}
    </div>
  )
}

// ── Celebration Row ───────────────────────────────────────────────────────────

function CelebRow({ escala, defaultOpen = false }: { escala: HistoricoEscala; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const c = escala.celebracao
  const itens = escala.escala_itens ?? []

  const serviu     = itens.filter((i) => i.presenca?.status === 'serviu').length
  const faltou     = itens.filter((i) => i.presenca?.status === 'faltou').length
  const substituido = itens.filter((i) => i.presenca?.status === 'substituido').length
  const semRegistro = itens.filter((i) => !i.presenca?.status).length

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <DateBox data={c.data} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">
              {format(parseDate(c.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />{formatHorario(c.horario)}
            </span>
            <Badge variant={getPeriodoBadgeVariant(c.periodo_liturgico)} size="sm">{c.periodo_liturgico}</Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap">
            <CelebFlags c={c} />
            {/* Presence summary pills */}
            <div className="flex items-center gap-1.5 ml-auto">
              {serviu > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  <CheckCircle2 size={11} />{serviu}
                </span>
              )}
              {faltou > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  <XCircle size={11} />{faltou}
                </span>
              )}
              {substituido > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  <RotateCcw size={11} />{substituido}
                </span>
              )}
              {semRegistro > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                  <MinusCircle size={11} />{semRegistro}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/escalas/${escala.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
            title="Ver escala completa"
          >
            <Eye size={15} />
          </Link>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded items */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
          {itens.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum cerimoniário na escala</p>
          ) : (
            itens.map((item, idx) => {
              const status = item.presenca?.status
              const substituto = item.presenca?.substituto
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 h-5 rounded-full bg-wine-100 text-wine-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                      {item.funcao_label || item.funcao?.titulo || '—'}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {item.cerimoniario?.nome ?? <span className="text-gray-400 italic font-normal">Não atribuído</span>}
                    </div>
                    {status === 'substituido' && substituto && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <RotateCcw size={10} className="text-amber-500" />
                        <span className="text-[11px] text-amber-700 font-medium">{substituto.nome}</span>
                      </div>
                    )}
                  </div>
                  {item.cerimoniario && (
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(status)}`}>
                      <StatusIcon status={status} />
                      {statusLabel(status)}
                    </span>
                  )}
                </div>
              )
            })
          )}
          {escala.observacao && (
            <div className="px-5 py-2.5 text-xs text-gray-500 italic">
              Obs: {escala.observacao}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Historico() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [search, setSearch] = useState('')
  const [data, setData] = useState<HistoricoData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inicio = format(currentMonth, 'yyyy-MM-dd')
      const fim    = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const params = new URLSearchParams({ data_inicio: inicio, data_fim: fim })
      if (search.trim()) params.set('search', search.trim())
      const r = await api.get<HistoricoData>(`/historico?${params}`)
      setData(r.data)
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }, [currentMonth, search])

  useEffect(() => { load() }, [load])

  const escalas = data?.escalas ?? []
  const stats   = data?.stats

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Celebrações"
        subtitle={stats ? `${stats.total_celebracoes} ${stats.total_celebracoes !== 1 ? 'celebrações' : 'celebração'} em ${format(currentMonth, 'MMMM yyyy', { locale: ptBR })}` : 'Carregando...'}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-1 bg-white border-2 border-orange-100 rounded-xl px-1 py-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 text-gray-500 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1 text-sm font-semibold text-gray-800 capitalize min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            disabled={addMonths(currentMonth, 1) > startOfMonth(new Date())}
            className="p-1.5 text-gray-500 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por período litúrgico..."
            className="input-field pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Celebrações</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_celebracoes}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Presenças</p>
            <p className="text-2xl font-bold text-green-700">{stats.serviu}</p>
            {stats.substituido > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">+{stats.substituido} substituído</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Faltas</p>
            <p className="text-2xl font-bold text-red-600">{stats.faltou}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Taxa Presença</p>
            <p className="text-2xl font-bold text-wine-900">
              {stats.taxa_presenca !== null ? `${stats.taxa_presenca}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <LoadingSpinner />
        </div>
      ) : escalas.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Nenhuma celebração encontrada</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Tente outro termo de busca' : 'Não há celebrações passadas neste período'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalas.map((escala, i) => (
            <CelebRow key={escala.id} escala={escala} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {/* Footer info */}
      {escalas.length > 0 && stats && (
        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center pb-2">
          <Users size={13} />
          {stats.total_escalados} funções escaladas no período
        </div>
      )}
    </div>
  )
}

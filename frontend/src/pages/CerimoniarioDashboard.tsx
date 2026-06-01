import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  MinusCircle,
  Calendar,
  Clock,
  BarChart2,
  Star,
  Phone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '../lib/api'
import type { Cerimoniario } from '../types'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { parseDate, formatHorario, formatPhone } from '../lib/dateUtils'

// ── Types ────────────────────────────────────────────────────────────────────

interface HistoricoItem {
  escala_id: number
  data: string
  horario: string
  periodo_liturgico: string
  funcao: string | null
  status: 'serviu' | 'faltou' | 'substituido' | 'justificado' | null
  status_confirmacao: 'confirmado' | null
}

interface MensalItem {
  mes: number
  total: number
}

interface FuncaoItem {
  titulo: string
  total: number
}

interface Stats {
  total_escalado: number
  serviu: number
  faltou: number
  substituido: number
  justificado: number
  taxa_presenca: number | null
}

interface DashboardData {
  cerimoniario: Cerimoniario
  stats: Stats
  funcoes: FuncaoItem[]
  historico: HistoricoItem[]
  proximas: HistoricoItem[]
  mensais: MensalItem[]
  ano: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function formatDataCurta(raw: string) {
  try {
    return format(parseDate(raw), "dd/MM/yyyy (EEE)", { locale: ptBR })
  } catch {
    return raw.substring(0, 10)
  }
}

function StatusIcon({ status }: { status: HistoricoItem['status'] }) {
  if (status === 'serviu')      return <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
  if (status === 'faltou')      return <XCircle       size={15} className="text-red-500   flex-shrink-0" />
  if (status === 'substituido') return <RotateCcw     size={15} className="text-amber-500 flex-shrink-0" />
  if (status === 'justificado') return <AlertCircle   size={15} className="text-yellow-500 flex-shrink-0" />
  return <MinusCircle size={15} className="text-gray-300 flex-shrink-0" />
}

function StatusLabel({ status }: { status: HistoricoItem['status'] }) {
  const map: Record<string, string> = {
    serviu: 'Serviu', faltou: 'Faltou', substituido: 'Substituído', justificado: 'Justificado',
  }
  return <span className="text-xs text-gray-500">{status ? map[status] : '—'}</span>
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'green' | 'red' | 'gold'
}) {
  const valueColor = {
    default: 'text-gray-900',
    green:   'text-green-700',
    red:     'text-red-600',
    gold:    'text-wine-900',
  }[color]

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Availability Row ─────────────────────────────────────────────────────────

function AvailRow({ c }: { c: Cerimoniario }) {
  const slots = [
    { label: 'Dom M', val: c.disponivel_domingo_manha },
    { label: 'Dom T', val: c.disponivel_domingo_tarde },
    { label: 'Dom N', val: c.disponivel_domingo_noite },
    { label: 'Sem M', val: c.disponivel_semana_manha },
    { label: 'Sem T', val: c.disponivel_semana_tarde },
    { label: 'Sem N', val: c.disponivel_semana_noite },
    { label: 'Sáb',   val: c.disponivel_sabado },
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map(({ label, val }) => (
        <span
          key={label}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            val
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────

function MonthlyChart({ mensais, ano }: { mensais: MensalItem[]; ano: number }) {
  const maxVal = Math.max(...mensais.map((m) => m.total), 1)
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  return (
    <div className="flex items-end gap-1.5 h-28">
      {MESES_ABREV.map((label, i) => {
        const mes = i + 1
        const item = mensais.find((m) => m.mes === mes)
        const total = item?.total ?? 0
        const heightPct = total > 0 ? Math.max((total / maxVal) * 100, 8) : 0
        const isCurrent = mes === mesAtual && ano === anoAtual
        const isFuture  = ano === anoAtual && mes > mesAtual

        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1">
            <span className={`text-[10px] font-semibold ${total > 0 ? 'text-gray-700' : 'text-transparent'}`}>
              {total || '·'}
            </span>
            <div className="w-full flex items-end" style={{ height: '68px' }}>
              <div
                className={`w-full rounded-t transition-all ${
                  isFuture  ? 'bg-gray-100 rounded-sm' :
                  isCurrent ? 'bg-gold-500' :
                               'bg-wine-900'
                }`}
                style={{ height: total > 0 ? `${heightPct}%` : isFuture ? '4px' : '3px', minHeight: '3px' }}
              />
            </div>
            <span className={`text-[10px] ${isCurrent ? 'font-bold text-wine-900' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CerimoniarioDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: DashboardData }>(`/cerimoniarios/${id}/dashboard`)
      setData(r.data.data)
    } catch {
      toast.error('Erro ao carregar dashboard')
      navigate('/cerimoniarios')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data) return null

  const { cerimoniario: c, stats, funcoes, historico, proximas, mensais, ano } = data
  const maxFuncao = Math.max(...funcoes.map((f) => f.total), 1)

  return (
    <div className="space-y-6">

      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/cerimoniarios')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-wine-900 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Cerimoniários
        </button>

        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-wine-900 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-400 text-xl font-bold">{initials(c.nome)}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{c.nome}</h1>
                <Badge variant={c.ativo ? 'green' : 'gray'} size="sm">
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                {c.indisponivel_temporario && (
                  <Badge variant="red" size="sm">Temp. Indisp.</Badge>
                )}
              </div>
              {c.numero && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                  <Phone size={13} className="text-gray-400" />
                  {formatPhone(c.numero)}
                </div>
              )}
              <div className="mt-2">
                <AvailRow c={c} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Escalado"
          value={stats.total_escalado}
          sub="todas as celebrações"
        />
        <StatCard
          label="Presenças"
          value={stats.serviu}
          sub={stats.substituido > 0 ? `+${stats.substituido} substituído` : undefined}
          color="green"
        />
        <StatCard
          label="Faltas"
          value={stats.faltou}
          sub={stats.justificado > 0 ? `+${stats.justificado} justificado` : undefined}
          color="red"
        />
        <StatCard
          label="Taxa de Presença"
          value={stats.taxa_presenca !== null ? `${stats.taxa_presenca}%` : '—'}
          sub={stats.taxa_presenca === null ? 'sem registros' : stats.taxa_presenca >= 80 ? 'excelente' : stats.taxa_presenca >= 60 ? 'regular' : 'atenção'}
          color="gold"
        />
      </div>

      {/* Proximas + Funções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Próximas celebrações */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-wine-900" />
            <h2 className="font-semibold text-gray-900">Próximas Celebrações</h2>
          </div>
          {proximas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma celebração futura</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {proximas.map((item, i) => (
                <Link
                  key={i}
                  to={`/escalas/${item.escala_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-wine-200 hover:bg-wine-50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 flex flex-col items-center justify-center bg-wine-900 text-white rounded-lg">
                    <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">
                      {format(parseDate(item.data), 'EEE', { locale: ptBR })}
                    </span>
                    <span className="text-sm font-bold leading-tight">{format(parseDate(item.data), 'dd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-wine-900 truncate">
                      {format(parseDate(item.data), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />{formatHorario(item.horario)}
                      </span>
                      {item.funcao && (
                        <span className="text-xs text-wine-700 font-medium truncate">{item.funcao}</span>
                      )}
                    </div>
                  </div>
                  {item.status_confirmacao === 'confirmado' ? (
                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock size={14} className="text-gray-300 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Funções mais exercidas */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-wine-900" />
            <h2 className="font-semibold text-gray-900">Funções mais Exercidas</h2>
          </div>
          {funcoes.length === 0 ? (
            <div className="text-center py-8">
              <Star size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma função registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funcoes.map((f, i) => {
                const pct = Math.round((f.total / maxFuncao) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate pr-2">{f.titulo}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{f.total}x</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-wine-900 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Participações mensais */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={16} className="text-wine-900" />
          <h2 className="font-semibold text-gray-900">Participações em {ano}</h2>
        </div>
        {mensais.length === 0 ? (
          <div className="text-center py-6">
            <BarChart2 size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma participação registrada em {ano}</p>
          </div>
        ) : (
          <MonthlyChart mensais={mensais} ano={ano} />
        )}
      </div>

      {/* Histórico recente */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Clock size={16} className="text-wine-900" />
          <h2 className="font-semibold text-gray-900">Histórico Recente</h2>
        </div>

        {historico.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">Nenhuma participação passada</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-5 py-3">Horário</th>
                  <th className="text-left px-5 py-3">Período</th>
                  <th className="text-left px-5 py-3">Função</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {historico.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium whitespace-nowrap">
                      {formatDataCurta(item.data)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatHorario(item.horario)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="wine" size="sm">{item.periodo_liturgico}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {item.funcao ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={item.status} />
                        <StatusLabel status={item.status} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/escalas/${item.escala_id}`}
                        className="text-xs text-wine-700 hover:text-wine-900 font-medium hover:underline"
                      >
                        Ver escala
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {historico.map((item, i) => (
                <Link key={i} to={`/escalas/${item.escala_id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatDataCurta(item.data)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatHorario(item.horario)}
                      {item.funcao ? ` · ${item.funcao}` : ''}
                    </p>
                  </div>
                  <Badge variant="wine" size="sm">{item.periodo_liturgico}</Badge>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}

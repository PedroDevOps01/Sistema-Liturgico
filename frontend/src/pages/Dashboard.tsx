import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ListChecks,
  Users,
  Calendar,
  AlertCircle,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import api from '../lib/api'
import type { Dashboard as DashboardData, Celebracao } from '../types'
import { SkeletonCard } from '../components/common/LoadingSpinner'
import Badge from '../components/common/Badge'
import toast from 'react-hot-toast'
import { formatDataMedium, parseDateParts, formatHorario } from '../lib/dateUtils'
import { getPeriodoBadgeVariant } from '../lib/liturgico'

const formatData = formatDataMedium
const formatDayMonth = parseDateParts
const getPeriodoBadge = getPeriodoBadgeVariant

function DateChip({ data }: { data: string }) {
  const { day, month, weekday } = formatDayMonth(data)
  return (
    <div className="flex-shrink-0 w-11 h-11 flex flex-col items-center justify-center bg-wine-900 rounded-lg text-white">
      <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">{weekday}</span>
      <span className="text-base font-bold leading-tight">{day}</span>
      <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">{month}</span>
    </div>
  )
}

function CelebracaoListItem({ c }: { c: Celebracao }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer">
      <DateChip data={c.data} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{formatData(c.data)}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            {formatHorario(c.horario)}
          </span>
          <Badge variant={getPeriodoBadge(c.periodo_liturgico)} size="sm">
            {c.periodo_liturgico}
          </Badge>
          {c.celebracao_noite && <Badge variant="blue" size="sm">Noite</Badge>}
          {c.possui_bispo && <Badge variant="purple" size="sm">Bispo</Badge>}
          {c.casamento && <Badge variant="gold" size="sm">Casamento</Badge>}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    {
      label: 'Escalas do Mês',
      value: data?.escalasDoMes ?? 0,
      icon: ListChecks,
      iconBg: 'bg-wine-900',
      iconColor: 'text-white',
      link: '/escalas',
    },
    {
      label: 'Cerimoniários Ativos',
      value: data?.cerimoniarios_ativos ?? 0,
      icon: Users,
      iconBg: 'bg-gold-500',
      iconColor: 'text-black',
      link: '/cerimoniarios',
    },
    {
      label: 'Próximas Celebrações',
      value: data?.proximasCelebracoes?.length ?? 0,
      icon: Calendar,
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      link: '/celebracoes',
    },
    {
      label: 'Sem Escala',
      value: data?.celebracoesSemEscala ?? 0,
      icon: AlertCircle,
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      link: '/celebracoes',
    },
  ]

  const quickActions = [
    {
      label: 'Nova Escala',
      desc: 'Monte uma escala para celebração',
      icon: ListChecks,
      to: '/escalas/nova',
      color: 'bg-wine-900',
    },
    {
      label: 'Nova Celebração',
      desc: 'Cadastre uma celebração litúrgica',
      icon: Calendar,
      to: '/celebracoes',
      color: 'bg-blue-600',
    },
    {
      label: 'Novo Cerimoniário',
      desc: 'Adicione um membro ao time',
      icon: Users,
      to: '/cerimoniarios',
      color: 'bg-gold-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link to="/escalas/nova" className="btn-primary">
          <Plus size={18} />
          Nova Escala
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, iconBg, iconColor, link }) => (
            <Link
              key={label}
              to={link}
              className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
            >
              <div className={`${iconBg} w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                <Icon size={22} className={iconColor} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 leading-none">{value}</div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {quickActions.map(({ label, desc, icon: Icon, to, color }) => (
          <Link
            key={label}
            to={to}
            className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
          >
            <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
              <Icon size={20} className={color === 'bg-gold-500' ? 'text-black' : 'text-white'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{desc}</div>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Proximas Celebrações */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              Próximas Celebrações
            </h2>
            <Link to="/celebracoes" className="text-xs text-wine-700 hover:text-wine-900 font-semibold transition-colors">
              Ver todas
            </Link>
          </div>
          <div className="overflow-y-auto max-h-80 p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2">
                    <div className="skeleton w-14 h-14 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 rounded w-2/3" />
                      <div className="skeleton h-3 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.proximasCelebracoes && data.proximasCelebracoes.length > 0 ? (
              data.proximasCelebracoes.map((c) => (
                <Link key={c.id} to="/celebracoes">
                  <CelebracaoListItem c={c} />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Calendar size={24} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-500 text-sm">Sem celebrações próximas</p>
                <p className="text-xs text-gray-400 mt-1">Cadastre uma nova celebração para começar</p>
                <Link to="/celebracoes" className="mt-3 btn-primary text-sm px-4 py-2">
                  <Plus size={14} />
                  Nova Celebração
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sem Escala */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Celebrações sem Escala
            </h2>
            <Link to="/celebracoes" className="text-xs text-wine-700 hover:text-wine-900 font-semibold transition-colors">
              Ver
            </Link>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded-xl" />
                ))}
              </div>
            ) : (data?.celebracoesSemEscala ?? 0) > 0 ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-600 leading-none">{data?.celebracoesSemEscala}</div>
                  <div className="text-gray-500 text-sm mt-2">
                    {data?.celebracoesSemEscala === 1
                      ? 'Celebração aguarda escala'
                      : 'Celebrações aguardam escala'}
                  </div>
                </div>
                <Link to="/celebracoes" className="btn-danger text-sm px-5 py-2.5">
                  <Plus size={16} />
                  Criar escalas
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-3">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <p className="font-bold text-green-700">Tudo escalado!</p>
                <p className="text-sm text-gray-400 mt-1">Todas as celebrações têm escala</p>
              </div>
            )}

            {/* Conflito alert */}
            {!loading && (data?.alertasConflito ?? 0) > 0 && (
              <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold text-amber-800">
                    {data?.alertasConflito} conflito{(data?.alertasConflito ?? 0) > 1 ? 's' : ''} detectado{(data?.alertasConflito ?? 0) > 1 ? 's' : ''}
                  </span>
                  <span className="text-amber-700"> — verifique as escalas.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

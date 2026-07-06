import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Eye, Pencil, FileDown, MessageCircle,
  Calendar, Search, Clock, X, MoreVertical, ToggleLeft, ToggleRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { getPeriodoBadgeVariant, formatPeriodoParaExibicao } from '../lib/liturgico'
import type { Escala } from '../types'
import ActionsDrawer from '../components/common/ActionsDrawer'
import InativosToggle from '../components/common/InativosToggle'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { SkeletonRow } from '../components/common/LoadingSpinner'
import { formatDataShort, formatDatetime, formatHorario, parseDateParts } from '../lib/dateUtils'

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

export default function Escalas() {
  const navigate = useNavigate()
  const [list, setList] = useState<Escala[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Escala | null>(null)
  const [menuTarget, setMenuTarget] = useState<Escala | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [search, setSearch] = useState('')

  const loadList = useCallback(async () => {
    try {
      const r = await api.get<Escala[]>('/escalas?todos=1')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar escalas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  async function toggleAtivo(escala: Escala) {
    try {
      await api.patch(`/escalas/${escala.id}/toggle-ativo`)
      toast.success(escala.ativo ? 'Escala inativada' : 'Escala ativada')
      loadList()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/escalas/${deleteTarget.id}`)
      toast.success('Escala removida')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover escala')
    }
  }

async function handleDownloadPdf(escala: Escala) {
    try {
      const r = await api.get(`/escalas/${escala.id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `escala-${escala.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar PDF')
    }
  }

  async function handleWhatsApp(escala: Escala) {
    try {
      const r = await api.get<{ texto: string }>(`/escalas/${escala.id}/whatsapp`)
      const text = encodeURIComponent(r.data.texto)
      window.open(`https://wa.me/?text=${text}`, '_blank')
    } catch {
      toast.error('Erro ao gerar mensagem WhatsApp')
    }
  }

  function isDatePast(data: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateStr = data.substring(0, 10)
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d) < today
  }

  const inativos = list.filter((e) => !e.ativo)
  const filtered = list
    .filter((e) => {
      if (!mostrarInativos && !e.ativo) return false
      if (!search) return true
      const term = search.toLowerCase()
      const dateStr = e.celebracao ? formatDataShort(e.celebracao.data).toLowerCase() : ''
      const periodo = e.celebracao?.periodo_liturgico?.toLowerCase() ?? ''
      const horario = e.celebracao?.horario ?? ''
      return dateStr.includes(term) || periodo.includes(term) || horario.includes(term)
    })
    .sort((a, b) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const toDate = (data?: string) => {
        if (!data) return new Date(9999, 0, 1)
        const [y, m, d] = data.substring(0, 10).split('-').map(Number)
        return new Date(y, m - 1, d)
      }
      const dA = toDate(a.celebracao?.data)
      const dB = toDate(b.celebracao?.data)
      const pastA = dA < today
      const pastB = dB < today
      if (pastA && !pastB) return 1
      if (!pastA && pastB) return -1
      if (pastA && pastB) return dB.getTime() - dA.getTime()
      return dA.getTime() - dB.getTime()
    })

  function isEscalaCompleta(e: Escala): boolean {
    const itens = e.escala_itens ?? e.itens ?? []
    if (itens.length === 0) return false
    return itens.every((item) => item.cerimoniario_id != null)
  }

  function getItemCount(e: Escala): number {
    return (e.escala_itens ?? e.itens ?? []).length
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalas"
        subtitle={`${list.length} escalas cadastradas`}
        action={
          <Link to="/escalas/nova" className="btn-primary">
            <Plus size={18} />
            Nova Escala
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por data, período..."
            className="input-field pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <InativosToggle mostrarInativos={mostrarInativos} onChange={setMostrarInativos} count={inativos.length} />
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
            </tbody>
          </table>
        </div>
      ) : list.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-gray-400" />
          </div>
          <p className="text-lg font-bold text-gray-600 mb-1">Nenhuma escala criada</p>
          <p className="text-sm text-gray-400 mb-5">Comece criando uma nova escala para uma celebração</p>
          <Link to="/escalas/nova" className="btn-primary inline-flex">
            <Plus size={18} />
            Nova Escala
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="bg-wine-900 text-white">
                <th className="text-left px-5 py-3.5 font-semibold text-sm">Celebração</th>
                <th className="text-left px-5 py-3.5 font-semibold text-sm hidden md:table-cell">Período</th>
                <th className="text-left px-5 py-3.5 font-semibold text-sm hidden lg:table-cell">Criada em</th>
                <th className="text-left px-5 py-3.5 font-semibold text-sm">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    Nenhuma escala encontrada para "{search}"
                  </td>
                </tr>
              ) : filtered.map((escala) => (
                <tr
                  key={escala.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {escala.celebracao ? (
                        <DateBox data={escala.celebracao.data} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center">
                          <Calendar size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {escala.celebracao ? formatDataShort(escala.celebracao.data) : `Escala #${escala.id}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {escala.celebracao && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={11} />{formatHorario(escala.celebracao.horario)}
                            </span>
                          )}
                          {getItemCount(escala) > 0 && (
                            <span className="text-xs text-gray-400">
                              {getItemCount(escala)} {getItemCount(escala) === 1 ? 'função' : 'funções'}
                            </span>
                          )}
                          {isEscalaCompleta(escala) && (
                            <Badge variant="green" size="sm">Completa</Badge>
                          )}
                          {escala.celebracao && isDatePast(escala.celebracao.data) && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                              Data passada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {escala.celebracao?.periodo_liturgico ? (
                      <Badge variant={getPeriodoBadgeVariant(escala.celebracao.periodo_liturgico)} size="sm">{formatPeriodoParaExibicao(escala.celebracao.periodo_liturgico, escala.celebracao.data)}</Badge>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-gray-500 text-sm">
                    {formatDatetime(escala.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={escala.ativo ? 'green' : 'red'} size="sm">
                      {escala.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setMenuTarget(escala)}
                        className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                        title="Ações"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Inativar Escala"
        message="Tem certeza que deseja inativar esta escala?"
        confirmLabel="Inativar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ActionsDrawer
        isOpen={!!menuTarget}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.celebracao ? formatDataShort(menuTarget.celebracao.data) : `Escala #${menuTarget?.id}`}
        subtitle={menuTarget?.celebracao ? `${formatHorario(menuTarget.celebracao.horario)} · ${formatPeriodoParaExibicao(menuTarget.celebracao.periodo_liturgico, menuTarget.celebracao.data)}` : ''}
        actions={menuTarget ? [
          { label: 'Visualizar', icon: <Eye size={18} />, onClick: () => navigate(`/escalas/${menuTarget.id}`) },
          { label: 'Editar', icon: <Pencil size={18} />, onClick: () => navigate(`/escalas/${menuTarget.id}/editar`) },
          { label: 'Baixar PDF', icon: <FileDown size={18} />, onClick: () => handleDownloadPdf(menuTarget) },
          { label: 'Enviar WhatsApp', icon: <MessageCircle size={18} />, onClick: () => handleWhatsApp(menuTarget), separator: true },
          {
            label: menuTarget.ativo ? 'Inativar' : 'Ativar',
            icon: menuTarget.ativo ? <ToggleLeft size={18} /> : <ToggleRight size={18} />,
            onClick: () => toggleAtivo(menuTarget),
            variant: menuTarget.ativo ? 'warning' as const : 'success' as const,
            separator: true,
          },
        ] : []}
      />
    </div>
  )
}

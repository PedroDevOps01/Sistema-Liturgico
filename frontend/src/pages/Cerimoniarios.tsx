import { useEffect, useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Trash2, Users, X, LayoutDashboard, MoreVertical } from 'lucide-react'
import { formatPhone } from '../lib/dateUtils'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import type { Cerimoniario } from '../types'
import ActionsDrawer from '../components/common/ActionsDrawer'
import InativosToggle from '../components/common/InativosToggle'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { SkeletonRow } from '../components/common/LoadingSpinner'

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  numero: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[\d\s\(\)\-\+]{7,20}$/.test(v),
      'Telefone inválido. Use formato: (11) 99999-9999'
    ),
  observacao: z.string().optional(),
  disponivel_domingo_manha: z.boolean(),
  disponivel_domingo_tarde: z.boolean(),
  disponivel_domingo_noite: z.boolean(),
  disponivel_semana_manha: z.boolean(),
  disponivel_semana_tarde: z.boolean(),
  disponivel_semana_noite: z.boolean(),
  disponivel_sabado: z.boolean(),
  indisponivel_temporario: z.boolean(),
  experiente: z.boolean(),
})

type FormData = z.infer<typeof schema>

const bulkRowSchema = z.object({
  rows: z.array(z.object({ nome: z.string().min(2) })),
})
type BulkData = z.infer<typeof bulkRowSchema>

const defaultValues: FormData = {
  nome: '',
  numero: '',
  observacao: '',
  disponivel_domingo_manha: true,
  disponivel_domingo_tarde: true,
  disponivel_domingo_noite: false,
  disponivel_semana_manha: true,
  disponivel_semana_tarde: true,
  disponivel_semana_noite: false,
  disponivel_sabado: true,
  indisponivel_temporario: false,
  experiente: false,
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-wine-900' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700 leading-tight">{label}</span>
    </label>
  )
}

function AvailabilityDots({ c }: { c: Cerimoniario }) {
  const slots = [
    { key: 'dom_m', label: 'Dom M', val: c.disponivel_domingo_manha },
    { key: 'dom_t', label: 'Dom T', val: c.disponivel_domingo_tarde },
    { key: 'dom_n', label: 'Dom N', val: c.disponivel_domingo_noite },
    { key: 'sem_m', label: 'Sem M', val: c.disponivel_semana_manha },
    { key: 'sem_t', label: 'Sem T', val: c.disponivel_semana_tarde },
    { key: 'sem_n', label: 'Sem N', val: c.disponivel_semana_noite },
    { key: 'sab', label: 'Sáb', val: c.disponivel_sabado },
  ]
  return (
    <div className="flex gap-1 flex-wrap">
      {slots.map(({ key, label, val }) => (
        <span
          key={key}
          title={label}
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${val ? 'bg-green-500' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function Cerimoniarios() {
  const navigate = useNavigate()
  const [list, setList] = useState<Cerimoniario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cerimoniario | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Cerimoniario | null>(null)
  const [menuTarget, setMenuTarget] = useState<Cerimoniario | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues })

  const bulkForm = useForm<BulkData>({
    resolver: zodResolver(bulkRowSchema),
    defaultValues: { rows: [{ nome: '' }] },
  })
  const { fields, append, remove } = useFieldArray({ control: bulkForm.control, name: 'rows' })

  const loadList = useCallback(async () => {
    try {
      const r = await api.get<Cerimoniario[]>('/cerimoniarios?todos=1')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar cerimoniários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  function openCreate() {
    setEditing(null)
    reset(defaultValues)
    setModalOpen(true)
  }

  function openEdit(c: Cerimoniario) {
    setEditing(c)
    reset({ ...c, numero: c.numero ?? '', observacao: c.observacao ?? '' })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    try {
      if (editing) {
        await api.put(`/cerimoniarios/${editing.id}`, data)
        toast.success('Cerimoniário atualizado!')
      } else {
        await api.post('/cerimoniarios', data)
        toast.success('Cerimoniário criado!')
      }
      setModalOpen(false)
      loadList()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } }
      if (axiosErr?.response?.status === 422 && axiosErr.response.data?.errors) {
        const errs = axiosErr.response.data.errors
        Object.entries(errs).forEach(([field, messages]) => {
          toast.error(`${field}: ${messages[0]}`)
        })
      } else {
        toast.error(axiosErr?.response?.data?.message ?? 'Erro ao salvar cerimoniário')
      }
    }
  }

  async function toggleAtivo(c: Cerimoniario) {
    try {
      await api.patch(`/cerimoniarios/${c.id}/toggle-ativo`)
      toast.success(c.ativo ? 'Cerimoniário desativado' : 'Cerimoniário ativado')
      loadList()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/cerimoniarios/${deleteTarget.id}`)
      toast.success('Cerimoniário removido')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover cerimoniário')
    }
  }

  async function saveBulk(data: BulkData) {
    try {
      await Promise.all(
        data.rows
          .filter((r) => r.nome.trim())
          .map((r) => api.post('/cerimoniarios', { ...defaultValues, nome: r.nome.trim() }))
      )
      toast.success('Cerimoniários adicionados!')
      setBulkModalOpen(false)
      bulkForm.reset({ rows: [{ nome: '' }] })
      loadList()
    } catch {
      toast.error('Erro ao adicionar cerimoniários')
    }
  }

  const inativos = list.filter((c) => !c.ativo)
  const filtered = list.filter((c) =>
    (mostrarInativos || c.ativo) &&
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  const watchedFields = watch()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cerimoniários"
        subtitle={`${list.filter((c) => c.ativo).length} ativos de ${list.length} cadastrados`}
        action={
          <div className="flex gap-2">
            <button onClick={() => setBulkModalOpen(true)} className="btn-secondary text-sm px-4 py-2">
              <Users size={16} />
              <span className="hidden sm:inline">Em Massa</span>
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus size={18} />
              Novo Cerimoniário
            </button>
          </div>
        }
      />

      {/* Search + filtro inativos */}
      <div className="flex gap-3 flex-wrap items-center">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cerimoniário..."
          className="input-field pl-10 pr-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <InativosToggle
        mostrarInativos={mostrarInativos}
        onChange={setMostrarInativos}
        count={inativos.length}
      />
      </div>

      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="bg-wine-900 text-white">
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Nome</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Contato</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm hidden lg:table-cell">Disponibilidade</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Status</th>
              <th className="text-right px-5 py-3.5 font-semibold text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Users size={28} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500">Nenhum cerimoniário encontrado</p>
                      {search && <p className="text-sm text-gray-400 mt-1">Tente um termo diferente</p>}
                    </div>
                    {!search && (
                      <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 mt-1">
                        <Plus size={14} />
                        Adicionar Cerimoniário
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-gray-100 transition-colors duration-150 ${c.ativo ? 'hover:bg-gray-50' : 'bg-gray-50/60 opacity-60'}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold-400 text-xs font-bold">
                          {c.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{c.nome}</div>
                        {c.observacao && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.observacao}</div>
                        )}
                        {c.experiente && (
                          <Badge variant="gold" size="sm">Experiente</Badge>
                        )}
                        {c.indisponivel_temporario && (
                          <Badge variant="red" size="sm">Temp. Indisp.</Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-sm">
                    {c.numero ? formatPhone(c.numero) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <AvailabilityDots c={c} />
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={c.ativo ? 'green' : 'gray'} size="sm">
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setMenuTarget(c)}
                        className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                        title="Ações"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-5 rounded w-1/2" />
              <div className="skeleton h-4 rounded w-1/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Users size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Nenhum cerimoniário</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className={`card p-4 ${!c.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 text-xs font-bold">
                      {c.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{c.nome}</div>
                    {c.numero && <div className="text-sm text-gray-500">{formatPhone(c.numero)}</div>}
                  </div>
                </div>
                <Badge variant={c.ativo ? 'green' : 'gray'} size="sm">
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <AvailabilityDots c={c} />
                <button
                  onClick={() => setMenuTarget(c)}
                  className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                  title="Ações"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Cerimoniário' : 'Novo Cerimoniário'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Nome *</label>
            <input {...register('nome')} className="input-field" placeholder="Nome completo" />
            {errors.nome && <p className="text-red-600 text-sm mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className="label">Número / Contato</label>
            <input {...register('numero')} className="input-field" placeholder="(11) 99999-9999" />
            {errors.numero && <p className="text-red-600 text-sm mt-1">{errors.numero.message}</p>}
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea {...register('observacao')} rows={2} className="input-field resize-none" />
          </div>

          <div>
            <p className="label mb-2">Disponibilidade</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0 bg-gray-50 rounded-xl p-4">
              <ToggleField
                label="Domingo Manhã"
                checked={watchedFields.disponivel_domingo_manha}
                onChange={(v) => setValue('disponivel_domingo_manha', v)}
              />
              <ToggleField
                label="Domingo Tarde"
                checked={watchedFields.disponivel_domingo_tarde}
                onChange={(v) => setValue('disponivel_domingo_tarde', v)}
              />
              <ToggleField
                label="Domingo Noite"
                checked={watchedFields.disponivel_domingo_noite}
                onChange={(v) => setValue('disponivel_domingo_noite', v)}
              />
              <ToggleField
                label="Semana Manhã"
                checked={watchedFields.disponivel_semana_manha}
                onChange={(v) => setValue('disponivel_semana_manha', v)}
              />
              <ToggleField
                label="Semana Tarde"
                checked={watchedFields.disponivel_semana_tarde}
                onChange={(v) => setValue('disponivel_semana_tarde', v)}
              />
              <ToggleField
                label="Semana Noite"
                checked={watchedFields.disponivel_semana_noite}
                onChange={(v) => setValue('disponivel_semana_noite', v)}
              />
              <ToggleField
                label="Sábado"
                checked={watchedFields.disponivel_sabado}
                onChange={(v) => setValue('disponivel_sabado', v)}
              />
              <ToggleField
                label="Indisponível Temporário"
                checked={watchedFields.indisponivel_temporario}
                onChange={(v) => setValue('indisponivel_temporario', v)}
              />
              <ToggleField
                label="Experiente"
                checked={watchedFields.experiente}
                onChange={(v) => setValue('experiente', v)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Adicionar em Massa"
        size="md"
      >
        <form onSubmit={bulkForm.handleSubmit(saveBulk)} className="space-y-4">
          <p className="text-gray-500 text-sm">Adicione vários cerimoniários de uma vez.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...bulkForm.register(`rows.${index}.nome`)}
                  className="input-field flex-1"
                  placeholder={`Cerimoniário ${index + 1}`}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ nome: '' })}
            className="flex items-center gap-2 text-wine-700 hover:text-wine-900 font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            Adicionar linha
          </button>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setBulkModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={bulkForm.formState.isSubmitting}
              className="btn-primary"
            >
              {bulkForm.formState.isSubmitting ? 'Salvando...' : 'Salvar Todos'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Inativar Cerimoniário"
        message={`Tem certeza que deseja inativar "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Inativar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Actions Drawer */}
      <ActionsDrawer
        isOpen={!!menuTarget}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.nome ?? ''}
        subtitle={menuTarget?.ativo ? 'Ativo' : 'Inativo'}
        actions={menuTarget ? [
          {
            label: 'Ver Dashboard',
            icon: <LayoutDashboard size={18} />,
            onClick: () => navigate(`/cerimoniarios/${menuTarget.id}`),
          },
          {
            label: 'Editar',
            icon: <Pencil size={18} />,
            onClick: () => openEdit(menuTarget),
          },
          {
            label: menuTarget.ativo ? 'Desativar' : 'Ativar',
            icon: menuTarget.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />,
            onClick: () => toggleAtivo(menuTarget),
            variant: menuTarget.ativo ? 'warning' as const : 'success' as const,
            separator: true,
          },
        ] : []}
      />
    </div>
  )
}

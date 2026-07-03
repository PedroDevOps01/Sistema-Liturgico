import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, ToggleLeft, ToggleRight, KeyRound, UserCog, Eye, EyeOff, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { User } from '../types'
import Modal from '../components/common/Modal'
import ActionsDrawer from '../components/common/ActionsDrawer'
import InativosToggle from '../components/common/InativosToggle'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { SkeletonRow } from '../components/common/LoadingSpinner'

const numeroSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^[\d\s()\-+]{7,20}$/.test(v),
    'Telefone inválido. Use formato: (11) 99999-9999',
  )

const createSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  usuario: z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres'),
  numero: numeroSchema,
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  password_confirmation: z.string().min(6),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Senhas não conferem',
  path: ['password_confirmation'],
})

const editSchema = z.object({
  nome: z.string().min(2),
  usuario: z.string().min(3),
  numero: numeroSchema,
})

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').substring(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const resetSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  password_confirmation: z.string().min(6),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Senhas não conferem',
  path: ['password_confirmation'],
})

type CreateData = z.infer<typeof createSchema>
type EditData = z.infer<typeof editSchema>
type ResetData = z.infer<typeof resetSchema>

function UserAvatar({ nome }: { nome: string }) {
  const initials = nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
      <span className="text-gold-400 text-xs font-bold">{initials}</span>
    </div>
  )
}

export default function Usuarios() {
  const [list, setList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [menuTarget, setMenuTarget] = useState<User | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [showCreatePw, setShowCreatePw] = useState(false)
  const [showCreatePwConf, setShowCreatePwConf] = useState(false)
  const [showResetPw, setShowResetPw] = useState(false)
  const [showResetPwConf, setShowResetPwConf] = useState(false)

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })

  const loadList = useCallback(async () => {
    try {
      const r = await api.get<User[]>('/users?todos=1')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  async function handleCreate(data: CreateData) {
    try {
      await api.post('/users', data)
      toast.success('Usuário criado!')
      setCreateModalOpen(false)
      createForm.reset()
      loadList()
    } catch {
      toast.error('Erro ao criar usuário')
    }
  }

  async function handleEdit(data: EditData) {
    if (!editing) return
    try {
      await api.put(`/users/${editing.id}`, data)
      toast.success('Usuário atualizado!')
      setEditModalOpen(false)
      loadList()
    } catch {
      toast.error('Erro ao atualizar usuário')
    }
  }

  async function handleReset(data: ResetData) {
    if (!resetTarget) return
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, data)
      toast.success('Senha redefinida!')
      setResetModalOpen(false)
      resetForm.reset()
    } catch {
      toast.error('Erro ao redefinir senha')
    }
  }

  async function toggleAtivo(u: User) {
    try {
      await api.patch(`/users/${u.id}/toggle-ativo`)
      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário ativado')
      loadList()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  function openEdit(u: User) {
    setEditing(u)
    editForm.setValue('nome', u.nome)
    editForm.setValue('usuario', u.usuario)
    editForm.setValue('numero', maskPhone(u.numero ?? ''))
    setEditModalOpen(true)
  }

  function openReset(u: User) {
    setResetTarget(u)
    resetForm.reset()
    setResetModalOpen(true)
  }

  const ativos   = list.filter((u) => u.ativo).length
  const inativos  = list.filter((u) => !u.ativo).length
  const filtered  = list.filter((u) => mostrarInativos || u.ativo)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle={`${ativos} ativo${ativos !== 1 ? 's' : ''} de ${list.length} cadastrado${list.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => setCreateModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            Novo Usuário
          </button>
        }
      />

      {/* Filter */}
      <div className="flex justify-end">
        <InativosToggle mostrarInativos={mostrarInativos} onChange={setMostrarInativos} count={inativos} />
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="bg-wine-900 text-white">
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Usuário</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm hidden sm:table-cell">Login</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Status</th>
              <th className="text-right px-5 py-3.5 font-semibold text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <UserCog size={28} className="text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-500">Nenhum usuário cadastrado</p>
                    <button onClick={() => setCreateModalOpen(true)} className="btn-primary text-sm px-4 py-2">
                      <Plus size={14} />
                      Criar primeiro usuário
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`border-t border-gray-100 transition-colors duration-150 ${u.ativo ? 'hover:bg-gray-50' : 'bg-gray-50/60 opacity-60'}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar nome={u.nome} />
                      <div className="font-semibold text-gray-900 text-sm">{u.nome}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <code className="text-gray-600 text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">
                      @{u.usuario}
                    </code>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={u.ativo ? 'green' : 'red'} size="sm">
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setMenuTarget(u)}
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

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Novo Usuário" size="md"
        footer={<>
          <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="submit" form="form-create-user" disabled={createForm.formState.isSubmitting} className="btn-primary">
            {createForm.formState.isSubmitting ? 'Criando...' : 'Criar'}
          </button>
        </>}>
        <form id="form-create-user" onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          <div>
            <label className="label">Nome completo *</label>
            <input {...createForm.register('nome')} className="input-field" placeholder="Nome do usuário" />
            {createForm.formState.errors.nome && (
              <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className="label">Usuário (login) *</label>
            <input {...createForm.register('usuario')} className="input-field" placeholder="usuario.login" />
            {createForm.formState.errors.usuario && (
              <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.usuario.message}</p>
            )}
          </div>
          <div>
            <label className="label">Número (WhatsApp)</label>
            <input
              {...createForm.register('numero')}
              className="input-field"
              placeholder="(88) 99999-9999"
              inputMode="numeric"
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value)
                createForm.register('numero').onChange(e)
              }}
            />
            {createForm.formState.errors.numero && (
              <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.numero.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Usado para receber alertas administrativos por WhatsApp (ex: justificativas pendentes).</p>
          </div>
          <div>
            <label className="label">Senha *</label>
            <div className="relative">
              <input {...createForm.register('password')} type={showCreatePw ? 'text' : 'password'} className="input-field pr-11" />
              <button type="button" onClick={() => setShowCreatePw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showCreatePw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {createForm.formState.errors.password && (
              <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirmar Senha *</label>
            <div className="relative">
              <input {...createForm.register('password_confirmation')} type={showCreatePwConf ? 'text' : 'password'} className="input-field pr-11" />
              <button type="button" onClick={() => setShowCreatePwConf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showCreatePwConf ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {createForm.formState.errors.password_confirmation && (
              <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.password_confirmation.message}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Usuário" size="md"
        footer={<>
          <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="submit" form="form-edit-user" disabled={editForm.formState.isSubmitting} className="btn-primary">
            {editForm.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </>}>
        <form id="form-edit-user" onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
          <div>
            <label className="label">Nome completo *</label>
            <input {...editForm.register('nome')} className="input-field" />
            {editForm.formState.errors.nome && (
              <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className="label">Usuário (login) *</label>
            <input {...editForm.register('usuario')} className="input-field" />
            {editForm.formState.errors.usuario && (
              <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.usuario.message}</p>
            )}
          </div>
          <div>
            <label className="label">Número (WhatsApp)</label>
            <input
              {...editForm.register('numero')}
              className="input-field"
              placeholder="(88) 99999-9999"
              inputMode="numeric"
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value)
                editForm.register('numero').onChange(e)
              }}
            />
            {editForm.formState.errors.numero && (
              <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.numero.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Usado para receber alertas administrativos por WhatsApp (ex: justificativas pendentes).</p>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title={`Redefinir Senha — ${resetTarget?.nome}`} size="md"
        footer={<>
          <button type="button" onClick={() => setResetModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="submit" form="form-reset-pw" disabled={resetForm.formState.isSubmitting} className="btn-primary">
            {resetForm.formState.isSubmitting ? 'Salvando...' : 'Redefinir'}
          </button>
        </>}>
        <form id="form-reset-pw" onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
            <KeyRound size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Definindo nova senha para <strong>@{resetTarget?.usuario}</strong>
            </p>
          </div>
          <div>
            <label className="label">Nova Senha *</label>
            <div className="relative">
              <input {...resetForm.register('password')} type={showResetPw ? 'text' : 'password'} className="input-field pr-11" />
              <button type="button" onClick={() => setShowResetPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showResetPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetForm.formState.errors.password && (
              <p className="text-red-600 text-sm mt-1">{resetForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirmar Nova Senha *</label>
            <div className="relative">
              <input {...resetForm.register('password_confirmation')} type={showResetPwConf ? 'text' : 'password'} className="input-field pr-11" />
              <button type="button" onClick={() => setShowResetPwConf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showResetPwConf ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetForm.formState.errors.password_confirmation && (
              <p className="text-red-600 text-sm mt-1">{resetForm.formState.errors.password_confirmation.message}</p>
            )}
          </div>
        </form>
      </Modal>

      <ActionsDrawer
        isOpen={!!menuTarget}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.nome ?? ''}
        subtitle={`@${menuTarget?.usuario ?? ''} · ${menuTarget?.ativo ? 'Ativo' : 'Inativo'}`}
        actions={menuTarget ? [
          { label: 'Editar', icon: <Pencil size={18} />, onClick: () => openEdit(menuTarget) },
          { label: 'Redefinir Senha', icon: <KeyRound size={18} />, onClick: () => openReset(menuTarget), variant: 'warning' as const },
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

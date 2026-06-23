import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ArrowUpDown, RotateCcw, Shirt, AlertTriangle, PackageSearch } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Tunica, Cerimoniario } from '../types'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Badge from '../components/common/Badge'
import SearchableSelect from '../components/common/SearchableSelect'

// ─── Schemas ────────────────────────────────────────────────────────────────

const tunicaSchema = z.object({
  codigo: z.string().min(1, 'Código obrigatório'),
  tamanho: z.enum(['PP', 'P', 'M', 'G', 'GG']).optional().or(z.literal('')).transform(v => v || undefined),
  cor: z.enum(['branca', 'vermelha', 'preta']),
  estado: z.enum(['novo', 'bom', 'regular', 'ruim']),
  observacao: z.string().optional(),
})
type TunicaForm = z.infer<typeof tunicaSchema>

const emprestarSchema = z.object({
  cerimoniario_id: z.number({ required_error: 'Selecione um cerimoniário' }),
  data_devolucao_prevista: z.string().optional(),
  observacao: z.string().optional(),
})
type EmprestarForm = z.infer<typeof emprestarSchema>

const devolverSchema = z.object({
  observacao: z.string().optional(),
})
type DevolverForm = z.infer<typeof devolverSchema>

// ─── Helpers ────────────────────────────────────────────────────────────────

function estadoBadgeVariant(estado: string): 'green' | 'blue' | 'gold' | 'red' | 'gray' {
  if (estado === 'novo') return 'green'
  if (estado === 'bom') return 'blue'
  if (estado === 'regular') return 'orange' as unknown as 'gold'
  if (estado === 'ruim') return 'red'
  return 'gray'
}

function estadoBadgeVariantSafe(estado: string): 'green' | 'blue' | 'orange' | 'red' | 'gray' {
  if (estado === 'novo') return 'green'
  if (estado === 'bom') return 'blue'
  if (estado === 'regular') return 'orange'
  if (estado === 'ruim') return 'red'
  return 'gray'
}

function corDot(cor: string) {
  if (cor === 'branca') return 'border border-gray-300 bg-white'
  if (cor === 'vermelha') return 'bg-red-600'
  if (cor === 'preta') return 'bg-gray-900'
  return 'bg-gray-300'
}

function corLabel(cor: string) {
  if (cor === 'branca') return 'Branca'
  if (cor === 'vermelha') return 'Vermelha'
  if (cor === 'preta') return 'Preta'
  return cor
}

function formatDate(iso: string) {
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) } catch { return iso }
}

type FiltroTab = 'todas' | 'disponiveis' | 'emprestadas'

// ─── Main component ──────────────────────────────────────────────────────────

export default function Tunicas() {
  const [tunicas, setTunicas] = useState<Tunica[]>([])
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroTab>('todas')

  // Modals
  const [modalTunica, setModalTunica] = useState(false)
  const [modalEmprestar, setModalEmprestar] = useState(false)
  const [modalDevolver, setModalDevolver] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tunica | null>(null)
  const [editTarget, setEditTarget] = useState<Tunica | null>(null)
  const [emprestarTarget, setEmprestarTarget] = useState<Tunica | null>(null)
  const [devolverTarget, setDevolverTarget] = useState<Tunica | null>(null)
  const [perdidaTarget, setPerdidaTarget] = useState<Tunica | null>(null)
  const [encontradaTarget, setEncontradaTarget] = useState<Tunica | null>(null)

  // Forms
  const tunicaForm = useForm<TunicaForm>({
    resolver: zodResolver(tunicaSchema),
    defaultValues: { codigo: '', tamanho: undefined, cor: 'branca', estado: 'bom', observacao: '' },
  })
  const emprestarForm = useForm<EmprestarForm>({ resolver: zodResolver(emprestarSchema) })
  const devolverForm = useForm<DevolverForm>({ resolver: zodResolver(devolverSchema) })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, cRes] = await Promise.all([
        api.get<Tunica[]>('/tunicas'),
        api.get<Cerimoniario[]>('/cerimoniarios'),
      ])
      setTunicas(tRes.data)
      setCerimoniarios(cRes.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    tunicaForm.reset({ codigo: '', tamanho: 'M', cor: 'branca', estado: 'bom', observacao: '' })
    setModalTunica(true)
  }

  function openEdit(t: Tunica) {
    setEditTarget(t)
    tunicaForm.reset({ codigo: t.codigo, tamanho: t.tamanho ?? undefined, cor: t.cor, estado: t.estado, observacao: t.observacao ?? '' })
    setModalTunica(true)
  }

  function openEmprestar(t: Tunica) {
    setEmprestarTarget(t)
    emprestarForm.reset({ observacao: '' })
    setModalEmprestar(true)
  }

  function openDevolver(t: Tunica) {
    setDevolverTarget(t)
    devolverForm.reset({ observacao: '' })
    setModalDevolver(true)
  }

  async function onSaveTunica(data: TunicaForm) {
    try {
      if (editTarget) {
        await api.put(`/tunicas/${editTarget.id}`, data)
        toast.success('Túnica atualizada!')
      } else {
        await api.post('/tunicas', data)
        toast.success('Túnica criada!')
      }
      setModalTunica(false)
      loadData()
    } catch {
      toast.error('Erro ao salvar túnica')
    }
  }

  async function onEmprestar(data: EmprestarForm) {
    if (!emprestarTarget) return
    try {
      await api.post(`/tunicas/${emprestarTarget.id}/emprestar`, data)
      toast.success('Túnica emprestada!')
      setModalEmprestar(false)
      loadData()
    } catch {
      toast.error('Erro ao emprestar túnica')
    }
  }

  async function onDevolver(data: DevolverForm) {
    if (!devolverTarget) return
    try {
      await api.post(`/tunicas/${devolverTarget.id}/devolver`, data)
      toast.success('Túnica devolvida!')
      setModalDevolver(false)
      loadData()
    } catch {
      toast.error('Erro ao devolver túnica')
    }
  }

  async function onDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/tunicas/${deleteTarget.id}`)
      toast.success('Túnica removida!')
      setDeleteTarget(null)
      loadData()
    } catch {
      toast.error('Erro ao remover túnica')
    }
  }

  async function onMarcarPerdida() {
    if (!perdidaTarget) return
    try {
      await api.post(`/tunicas/${perdidaTarget.id}/perdida`)
      toast.success('Túnica marcada como perdida.')
      setPerdidaTarget(null)
      loadData()
    } catch {
      toast.error('Erro ao marcar túnica como perdida')
    }
  }

  async function onMarcarEncontrada() {
    if (!encontradaTarget) return
    try {
      await api.post(`/tunicas/${encontradaTarget.id}/encontrada`)
      toast.success('Túnica encontrada e disponível novamente.')
      setEncontradaTarget(null)
      loadData()
    } catch {
      toast.error('Erro ao marcar túnica como encontrada')
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const total = tunicas.length
  const disponiveis = tunicas.filter(t => !t.emprestimo_atual)
  const emprestadas = tunicas.filter(t => t.emprestimo_atual?.status === 'emprestada')
  const perdidas = tunicas.filter(t => t.emprestimo_atual?.status === 'perdida')

  const filtered = filtro === 'disponiveis'
    ? disponiveis
    : filtro === 'emprestadas'
    ? emprestadas
    : tunicas

  const cerOptions = cerimoniarios
    .filter(c => c.ativo)
    .map(c => ({ value: c.id, label: c.nome, subLabel: c.numero }))

  const tabs: { key: FiltroTab; label: string; count: number }[] = [
    { key: 'todas', label: 'Todas', count: total },
    { key: 'disponiveis', label: 'Disponíveis', count: disponiveis.length },
    { key: 'emprestadas', label: 'Emprestadas', count: emprestadas.length },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Túnicas"
        subtitle={`${total} túnica${total !== 1 ? 's' : ''} cadastrada${total !== 1 ? 's' : ''}`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={18} />
            Nova Túnica
          </button>
        }
      />

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Disponíveis', value: disponiveis.length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Emprestadas', value: emprestadas.length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Perdidas', value: perdidas.length, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.bg}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-sm">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
              filtro === t.key ? 'bg-white shadow-sm text-wine-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className={`text-xs rounded-full px-1.5 ${filtro === t.key ? 'bg-wine-100 text-wine-700' : 'bg-gray-200 text-gray-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Inventory grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-6 w-24 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Shirt size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Nenhuma túnica encontrada</p>
          <p className="text-sm text-gray-400 mt-1">
            {filtro === 'disponiveis' ? 'Não há túnicas disponíveis no momento.' :
             filtro === 'emprestadas' ? 'Não há túnicas emprestadas no momento.' :
             'Cadastre a primeira túnica clicando em "+ Nova Túnica".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => {
            const emp = t.emprestimo_atual
            const isEmprestada = emp?.status === 'emprestada'
            const isPerdida = emp?.status === 'perdida'
            let diasAtraso = 0
            if (isEmprestada && emp?.data_devolucao_prevista) {
              diasAtraso = differenceInDays(new Date(), parseISO(emp.data_devolucao_prevista))
            }

            return (
              <div key={t.id} className={`card p-4 flex flex-col gap-3 ${isPerdida ? 'border-red-200 bg-red-50/30' : isEmprestada ? 'border-blue-200 bg-blue-50/20' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{t.codigo}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {t.tamanho && <Badge variant="gray" size="sm">{t.tamanho}</Badge>}
                      <div className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full inline-block ${corDot(t.cor)}`} />
                        <span className="text-xs text-gray-500">{corLabel(t.cor)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={estadoBadgeVariantSafe(t.estado)} size="sm">
                    {t.estado.charAt(0).toUpperCase() + t.estado.slice(1)}
                  </Badge>
                </div>

                {/* Loan info */}
                {isEmprestada && emp && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                    <p className="font-semibold text-blue-800">{emp.cerimoniario?.nome ?? '—'}</p>
                    <p className="text-blue-600">Desde {formatDate(emp.data_emprestimo)}</p>
                    {emp.data_devolucao_prevista && (
                      <p className={diasAtraso > 0 ? 'text-red-600 font-semibold' : 'text-blue-600'}>
                        {diasAtraso > 0 ? `${diasAtraso} dia(s) de atraso` : `Devolução: ${formatDate(emp.data_devolucao_prevista)}`}
                      </p>
                    )}
                  </div>
                )}
                {isPerdida && (
                  <div className="bg-red-50 rounded-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-red-700">Perdida</p>
                  </div>
                )}

                {/* Observation */}
                {t.observacao && (
                  <p className="text-xs text-gray-400 italic line-clamp-2">{t.observacao}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                  {!isEmprestada && !isPerdida && (
                    <button
                      onClick={() => openEmprestar(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-wine-900 text-white rounded-lg py-1.5 hover:bg-wine-800 transition-colors"
                    >
                      <ArrowUpDown size={12} />
                      Emprestar
                    </button>
                  )}
                  {isEmprestada && (
                    <>
                      <button
                        onClick={() => openDevolver(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-green-700 text-white rounded-lg py-1.5 hover:bg-green-600 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Devolver
                      </button>
                      <button
                        onClick={() => setPerdidaTarget(t)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Marcar como perdida"
                      >
                        <AlertTriangle size={14} />
                      </button>
                    </>
                  )}
                  {isPerdida && (
                    <button
                      onClick={() => setEncontradaTarget(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg py-1.5 hover:bg-emerald-600 transition-colors"
                    >
                      <PackageSearch size={12} />
                      Encontrada
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Túnica ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalTunica}
        onClose={() => setModalTunica(false)}
        title={editTarget ? 'Editar Túnica' : 'Nova Túnica'}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalTunica(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-tunica" disabled={tunicaForm.formState.isSubmitting} className="btn-primary">
              {tunicaForm.formState.isSubmitting ? 'Salvando...' : editTarget ? 'Atualizar' : 'Criar'}
            </button>
          </>
        }
      >
        <form id="form-tunica" onSubmit={tunicaForm.handleSubmit(onSaveTunica)} className="space-y-4">
          <div>
            <label className="label">Código *</label>
            <input {...tunicaForm.register('codigo')} className="input-field" placeholder="Ex: T001" />
            {tunicaForm.formState.errors.codigo && (
              <p className="text-red-600 text-sm mt-1">{tunicaForm.formState.errors.codigo.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tamanho <span className="text-gray-400 font-normal">(opcional)</span></label>
              <select {...tunicaForm.register('tamanho')} className="input-field">
                <option value="">— Não informado</option>
                {(['PP', 'P', 'M', 'G', 'GG'] as const).map(sz => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cor</label>
              <select {...tunicaForm.register('cor')} className="input-field">
                <option value="branca">Branca</option>
                <option value="vermelha">Vermelha</option>
                <option value="preta">Preta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Estado</label>
            <select {...tunicaForm.register('estado')} className="input-field">
              <option value="novo">Novo</option>
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
            </select>
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea {...tunicaForm.register('observacao')} rows={2} className="input-field resize-none" />
          </div>
        </form>
      </Modal>

      {/* ── Modal Emprestar ────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalEmprestar}
        onClose={() => setModalEmprestar(false)}
        title={`Emprestar Túnica ${emprestarTarget?.codigo ?? ''}`}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalEmprestar(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-emprestar" disabled={emprestarForm.formState.isSubmitting} className="btn-primary">
              {emprestarForm.formState.isSubmitting ? 'Salvando...' : 'Emprestar'}
            </button>
          </>
        }
      >
        <form id="form-emprestar" onSubmit={emprestarForm.handleSubmit(onEmprestar)} className="space-y-4">
          <div>
            <label className="label">Cerimoniário *</label>
            <SearchableSelect
              options={cerOptions}
              value={emprestarForm.watch('cerimoniario_id') ?? null}
              onChange={(v) => emprestarForm.setValue('cerimoniario_id', v as number)}
              placeholder="Selecione o cerimoniário..."
            />
            {emprestarForm.formState.errors.cerimoniario_id && (
              <p className="text-red-600 text-sm mt-1">Selecione um cerimoniário</p>
            )}
          </div>
          <div>
            <label className="label">Data de Devolução Prevista (opcional)</label>
            <input {...emprestarForm.register('data_devolucao_prevista')} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea {...emprestarForm.register('observacao')} rows={2} className="input-field resize-none" />
          </div>
        </form>
      </Modal>

      {/* ── Modal Devolver ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalDevolver}
        onClose={() => setModalDevolver(false)}
        title={`Devolver Túnica ${devolverTarget?.codigo ?? ''}`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setModalDevolver(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-devolver" disabled={devolverForm.formState.isSubmitting} className="btn-primary">
              {devolverForm.formState.isSubmitting ? 'Confirmando...' : 'Confirmar Devolução'}
            </button>
          </>
        }
      >
        <form id="form-devolver" onSubmit={devolverForm.handleSubmit(onDevolver)} className="space-y-4">
          {devolverTarget?.emprestimo_atual && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              Túnica emprestada para <strong>{devolverTarget.emprestimo_atual.cerimoniario?.nome}</strong> em{' '}
              {formatDate(devolverTarget.emprestimo_atual.data_emprestimo)}.
            </div>
          )}
          <div>
            <label className="label">Observação (opcional)</label>
            <textarea {...devolverForm.register('observacao')} rows={2} className="input-field resize-none" placeholder="Estado da devolução, danos, etc." />
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover Túnica"
        message={`Tem certeza que deseja remover a túnica "${deleteTarget?.codigo}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      {/* ── Confirm Perdida ────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!perdidaTarget}
        title="Marcar como Perdida"
        message={`Confirmar que a túnica "${perdidaTarget?.codigo}" está perdida? Ela ficará registrada como perdida e não poderá ser devolvida normalmente.`}
        confirmLabel="Marcar como Perdida"
        onConfirm={onMarcarPerdida}
        onCancel={() => setPerdidaTarget(null)}
        variant="danger"
      />

      {/* ── Confirm Encontrada ─────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!encontradaTarget}
        title="Marcar como Encontrada"
        message={`A túnica "${encontradaTarget?.codigo}" foi encontrada? Ela voltará a ficar disponível para novos empréstimos.`}
        confirmLabel="Confirmar"
        onConfirm={onMarcarEncontrada}
        onCancel={() => setEncontradaTarget(null)}
        variant="default"
      />
    </div>
  )
}

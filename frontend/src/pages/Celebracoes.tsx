import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, Calendar, Clock, CheckCircle2, XCircle, Moon, X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import type { Celebracao, Escala } from '../types'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { SkeletonRow } from '../components/common/LoadingSpinner'

const PERIODOS = [
  'Tempo Comum',
  'Advento',
  'Natal',
  'Quaresma',
  'Páscoa',
  'Pentecostes',
]

const schema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  horario: z.string().min(1, 'Horário é obrigatório'),
  periodo_liturgico: z.string().min(1, 'Período litúrgico é obrigatório'),
  qtd_cerimoniarios: z.coerce.number().min(1, 'Mínimo 1').default(6),
  celebracao_noite: z.boolean(),
  possui_bispo: z.boolean(),
  celebracao_6h: z.boolean(),
  celebracao_palavra: z.boolean(),
  celebracao_solene: z.boolean(),
  casamento: z.boolean(),
  batismo: z.boolean(),
  crisma: z.boolean(),
  observacao: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const defaultFormValues: FormData = {
  data: '',
  horario: '',
  periodo_liturgico: 'Tempo Comum',
  qtd_cerimoniarios: 6,
  celebracao_noite: false,
  possui_bispo: false,
  celebracao_6h: false,
  celebracao_palavra: false,
  celebracao_solene: false,
  casamento: false,
  batismo: false,
  crisma: false,
  observacao: '',
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-wine-900' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

// Parses both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.000000Z" safely
function parseDate(raw: string): Date {
  const dateStr = raw.substring(0, 10) // take only "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Returns "YYYY-MM-DD" from any ISO date string (for form inputs)
function toDateInputValue(raw: string): string {
  return raw.substring(0, 10)
}

function formatData(data: string) {
  try {
    return format(parseDate(data), "dd/MM/yyyy (EEE)", { locale: ptBR })
  } catch {
    return data
  }
}

function DateBox({ data }: { data: string }) {
  try {
    const dt = parseDate(data)
    return (
      <div className="flex-shrink-0 w-11 h-11 flex flex-col items-center justify-center bg-wine-900 text-white rounded-lg">
        <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">
          {format(dt, 'EEE', { locale: ptBR })}
        </span>
        <span className="text-base font-bold leading-tight">{format(dt, 'dd')}</span>
        <span className="text-[9px] font-semibold uppercase opacity-60 leading-none">
          {format(dt, 'MMM', { locale: ptBR })}
        </span>
      </div>
    )
  } catch {
    return <div className="w-11 h-11 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">{data.substring(8,10)}</div>
  }
}

interface BatchForm {
  data: string
  horario: string
  periodo_liturgico: string
}

function defaultBatchForm(): BatchForm {
  return { data: '', horario: '', periodo_liturgico: 'Tempo Comum' }
}

export default function Celebracoes() {
  const navigate = useNavigate()
  const [list, setList] = useState<Celebracao[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Celebracao | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Celebracao | null>(null)
  // Reutilizar última escala
  const [ultimaEscalaModal, setUltimaEscalaModal] = useState(false)
  const [newCelebracaoId, setNewCelebracaoId] = useState<number | null>(null)
  const [ultimaEscala, setUltimaEscala] = useState<Escala | null>(null)
  // Final de semana batch
  const [finalDeSemana, setFinalDeSemana] = useState(false)
  const [qtdCelebracoes, setQtdCelebracoes] = useState(4)
  const [batchForms, setBatchForms] = useState<BatchForm[]>([])
  const [repetirDias, setRepetirDias] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<FormData>({ resolver: zodResolver(schema) as any, defaultValues: defaultFormValues })

  const watchedValues = watch()

  // Auto set celebracao_noite when horario >= 17:00
  const horario = watch('horario')
  useEffect(() => {
    if (horario) {
      const [h] = horario.split(':').map(Number)
      if (h >= 17) {
        setValue('celebracao_noite', true)
      }
    }
  }, [horario, setValue])

  // Sync batchForms length with qtdCelebracoes
  useEffect(() => {
    if (!finalDeSemana) return
    setBatchForms((prev) => {
      if (prev.length === qtdCelebracoes) return prev
      if (prev.length < qtdCelebracoes) {
        return [...prev, ...Array.from({ length: qtdCelebracoes - prev.length }, defaultBatchForm)]
      }
      return prev.slice(0, qtdCelebracoes)
    })
  }, [qtdCelebracoes, finalDeSemana])

  function handleFinalDeSemanaChange(v: boolean) {
    setFinalDeSemana(v)
    if (v) {
      setBatchForms(Array.from({ length: qtdCelebracoes }, defaultBatchForm))
    }
  }

  function updateBatchForm(idx: number, field: keyof BatchForm, value: string) {
    setBatchForms((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      // Se repetirDias e o campo é "data", propaga para todos
      if (field === 'data' && repetirDias) {
        return updated.map((f) => ({ ...f, data: value }))
      }
      return updated
    })
  }

  async function handleBatchSubmit() {
    // Validate batch forms
    const invalid = batchForms.some((bf) => !bf.data || !bf.horario || !bf.periodo_liturgico)
    if (invalid) {
      toast.error('Preencha data, horário e período de todas as celebrações.')
      return
    }
    setBatchSaving(true)
    try {
      const watchedData = watch()
      const flags = {
        possui_bispo:      watchedData.possui_bispo      ?? false,
        celebracao_6h:     watchedData.celebracao_6h     ?? false,
        celebracao_palavra:watchedData.celebracao_palavra?? false,
        celebracao_solene: watchedData.celebracao_solene ?? false,
        casamento:         watchedData.casamento         ?? false,
        batismo:           watchedData.batismo           ?? false,
        crisma:            watchedData.crisma            ?? false,
        qtd_cerimoniarios: watchedData.qtd_cerimoniarios ?? 6,
        observacao:        watchedData.observacao        ?? '',
        final_de_semana:   true,
      }
      const celebracoes = batchForms.map((bf) => {
        const [h] = (bf.horario || '00:00').split(':').map(Number)
        return { ...flags, data: bf.data, horario: bf.horario, periodo_liturgico: bf.periodo_liturgico, celebracao_noite: h >= 17 }
      })
      await api.post('/celebracoes/batch', { celebracoes })
      toast.success(`${batchForms.length} celebrações criadas com sucesso!`)
      setModalOpen(false)
      loadList()
    } catch {
      toast.error('Erro ao criar celebrações em lote')
    } finally {
      setBatchSaving(false)
    }
  }

  const loadList = useCallback(async () => {
    try {
      const r = await api.get<Celebracao[]>('/celebracoes')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar celebrações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  function openCreate() {
    setEditing(null)
    reset(defaultFormValues)
    setFinalDeSemana(false)
    setQtdCelebracoes(4)
    setBatchForms([])
    setModalOpen(true)
  }

  function openEdit(c: Celebracao) {
    setEditing(c)
    reset({ ...c, data: toDateInputValue(c.data), horario: c.horario.substring(0, 5), observacao: c.observacao ?? '', qtd_cerimoniarios: c.qtd_cerimoniarios })
    setFinalDeSemana(false)
    setQtdCelebracoes(4)
    setBatchForms([])
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    try {
      if (editing) {
        await api.put(`/celebracoes/${editing.id}`, data)
        toast.success('Celebração atualizada!')
        setModalOpen(false)
        loadList()
      } else if (finalDeSemana) {
        // Batch creation
        const flags = {
          possui_bispo: data.possui_bispo,
          celebracao_6h: data.celebracao_6h,
          celebracao_palavra: data.celebracao_palavra,
          celebracao_solene: data.celebracao_solene,
          casamento: data.casamento,
          batismo: data.batismo,
          crisma: data.crisma,
          qtd_cerimoniarios: data.qtd_cerimoniarios,
          observacao: data.observacao,
          final_de_semana: true,
        }
        const celebracoes = batchForms.map((bf) => {
          const [h] = (bf.horario || '00:00').split(':').map(Number)
          return {
            ...flags,
            data: bf.data,
            horario: bf.horario,
            periodo_liturgico: bf.periodo_liturgico,
            celebracao_noite: h >= 17,
          }
        })
        await api.post('/celebracoes/batch', { celebracoes })
        toast.success(`${batchForms.length} celebrações criadas!`)
        setModalOpen(false)
        loadList()
      } else {
        const r = await api.post<Celebracao>('/celebracoes', data)
        const novaId = r.data.id
        setModalOpen(false)
        loadList()
        // Perguntar se quer reutilizar última escala
        try {
          const ue = await api.get<Escala>('/escalas/ultima')
          if (ue.data && ue.data.id) {
            setUltimaEscala(ue.data)
            setNewCelebracaoId(novaId)
            setUltimaEscalaModal(true)
          } else {
            toast.success('Celebração criada!')
            navigate(`/escalas/nova?celebracao_id=${novaId}`)
          }
        } catch {
          toast.success('Celebração criada!')
          navigate(`/escalas/nova?celebracao_id=${novaId}`)
        }
      }
    } catch {
      toast.error('Erro ao salvar celebração')
    }
  }

  async function handleReutilizarEscala() {
    if (!ultimaEscala || !newCelebracaoId) return
    try {
      await api.post(`/escalas/${ultimaEscala.id}/duplicar`, { celebracao_id: newCelebracaoId })
      toast.success('Escala criada com base na última!')
      setUltimaEscalaModal(false)
      navigate(`/escalas/nova?celebracao_id=${newCelebracaoId}`)
    } catch {
      toast.error('Erro ao duplicar escala. Crie manualmente.')
      navigate(`/escalas/nova?celebracao_id=${newCelebracaoId}`)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/celebracoes/${deleteTarget.id}`)
      toast.success('Celebração removida')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover celebração')
    }
  }

  const filtered = list.filter((c) => {
    const term = search.toLowerCase()
    return (
      c.data.includes(term) ||
      c.periodo_liturgico.toLowerCase().includes(term) ||
      c.horario.includes(term)
    )
  })

  function getCelebrationFlags(c: Celebracao) {
    const flags = []
    if (c.celebracao_noite) flags.push({ label: 'Noite', variant: 'blue' as const })
    if (c.possui_bispo) flags.push({ label: 'Bispo', variant: 'purple' as const })
    if (c.casamento) flags.push({ label: 'Casamento', variant: 'gold' as const })
    if (c.batismo) flags.push({ label: 'Batismo', variant: 'blue' as const })
    if (c.crisma) flags.push({ label: 'Crisma', variant: 'purple' as const })
    if (c.celebracao_solene) flags.push({ label: 'Solene', variant: 'wine' as const })
    if (c.celebracao_palavra) flags.push({ label: 'Palavra', variant: 'green' as const })
    if (c.celebracao_6h) flags.push({ label: '6h', variant: 'orange' as const })
    return flags
  }

  const isNight = horario && Number(horario.split(':')[0]) >= 17

  const FormModal = (
    <Modal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      title={editing ? 'Editar Celebração' : 'Nova Celebração'}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Final de Semana toggle (only when creating) */}
        {!editing && (
          <div className="flex items-center justify-between px-4 py-3 bg-gold-500/10 border border-gold-500/30 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800">Final de Semana</p>
              <p className="text-xs text-gray-500 mt-0.5">Criar múltiplas celebrações de uma vez</p>
            </div>
            <Toggle label="" checked={finalDeSemana} onChange={handleFinalDeSemanaChange} />
          </div>
        )}

        {/* Batch mode: N sections */}
        {finalDeSemana && !editing ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="label mb-0 flex-shrink-0">Quantas celebrações?</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={qtdCelebracoes}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(8, Number(e.target.value)))
                    setQtdCelebracoes(v)
                  }}
                  className="input-field w-20"
                />
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <Toggle
                  label="Repetir mesmo dia em todas"
                  checked={repetirDias}
                  onChange={(v) => {
                    setRepetirDias(v)
                    if (v && batchForms[0]?.data) {
                      const primeiraData = batchForms[0].data
                      setBatchForms((prev) => prev.map((f) => ({ ...f, data: primeiraData })))
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {batchForms.map((bf, idx) => {
                const isNightBatch = bf.horario && Number(bf.horario.split(':')[0]) >= 17
                return (
                  <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-wine-900">Celebração {idx + 1}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Data *</label>
                        <input
                          type="date"
                          value={bf.data}
                          onChange={(e) => updateBatchForm(idx, 'data', e.target.value)}
                          className="input-field"
                        />
                        {repetirDias && idx === 0 && (
                          <p className="text-xs text-blue-600 mt-1">Esta data será copiada para todas</p>
                        )}
                        {repetirDias && idx > 0 && (
                          <p className="text-xs text-gray-400 mt-1">Igual à Celebração 1</p>
                        )}
                      </div>
                      <div>
                        <label className="label">Horário *</label>
                        <input
                          type="time"
                          value={bf.horario}
                          onChange={(e) => updateBatchForm(idx, 'horario', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Período Litúrgico *</label>
                      <select
                        value={bf.periodo_liturgico}
                        onChange={(e) => updateBatchForm(idx, 'periodo_liturgico', e.target.value)}
                        className="select-field"
                      >
                        {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {isNightBatch && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
                        <Moon size={13} className="flex-shrink-0" />
                        <span>Noturna detectada</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Shared flags */}
            <div>
              <p className="label mb-2">Características (compartilhadas por todas)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0 bg-gray-50 rounded-xl p-4">
                <Toggle label="Possui Bispo" checked={watchedValues.possui_bispo} onChange={(v) => setValue('possui_bispo', v)} />
                <Toggle label="Celebração das 6h" checked={watchedValues.celebracao_6h} onChange={(v) => setValue('celebracao_6h', v)} />
                <Toggle label="Celebração da Palavra" checked={watchedValues.celebracao_palavra} onChange={(v) => setValue('celebracao_palavra', v)} />
                <Toggle label="Celebração Solene" checked={watchedValues.celebracao_solene} onChange={(v) => setValue('celebracao_solene', v)} />
                <Toggle label="Casamento" checked={watchedValues.casamento} onChange={(v) => setValue('casamento', v)} />
                <Toggle label="Batismo" checked={watchedValues.batismo} onChange={(v) => setValue('batismo', v)} />
                <Toggle label="Crisma" checked={watchedValues.crisma} onChange={(v) => setValue('crisma', v)} />
              </div>
            </div>

            <div>
              <label className="label">Qtd. Cerimoniários (por celebração)</label>
              <input {...register('qtd_cerimoniarios', { valueAsNumber: true })} type="number" min={1} max={20} className="input-field" />
            </div>

            <div>
              <label className="label">Observação</label>
              <textarea {...register('observacao')} rows={2} className="input-field resize-none" />
            </div>
          </>
        ) : (
          <>
            {/* Single mode: original fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data *</label>
                <input {...register('data')} type="date" className="input-field" />
                {errors.data && <p className="text-red-600 text-sm mt-1">{errors.data.message}</p>}
              </div>
              <div>
                <label className="label">Horário *</label>
                <input {...register('horario')} type="time" className="input-field" />
                {errors.horario && <p className="text-red-600 text-sm mt-1">{errors.horario.message}</p>}
              </div>
            </div>

            {/* Night detection banner */}
            {isNight && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                <Moon size={16} className="flex-shrink-0" />
                <span>Celebração noturna detectada automaticamente</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Período Litúrgico *</label>
                <select {...register('periodo_liturgico')} className="select-field">
                  {PERIODOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Qtd. Cerimoniários</label>
                <input {...register('qtd_cerimoniarios', { valueAsNumber: true })} type="number" min={1} max={20} className="input-field" />
              </div>
            </div>

            <div>
              <p className="label mb-2">Características da Celebração</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0 bg-gray-50 rounded-xl p-4">
                <Toggle label="Celebração Noturna" checked={watchedValues.celebracao_noite} onChange={(v) => setValue('celebracao_noite', v)} />
                <Toggle label="Possui Bispo" checked={watchedValues.possui_bispo} onChange={(v) => setValue('possui_bispo', v)} />
                <Toggle label="Celebração das 6h" checked={watchedValues.celebracao_6h} onChange={(v) => setValue('celebracao_6h', v)} />
                <Toggle label="Celebração da Palavra" checked={watchedValues.celebracao_palavra} onChange={(v) => setValue('celebracao_palavra', v)} />
                <Toggle label="Celebração Solene" checked={watchedValues.celebracao_solene} onChange={(v) => setValue('celebracao_solene', v)} />
                <Toggle label="Casamento" checked={watchedValues.casamento} onChange={(v) => setValue('casamento', v)} />
                <Toggle label="Batismo" checked={watchedValues.batismo} onChange={(v) => setValue('batismo', v)} />
                <Toggle label="Crisma" checked={watchedValues.crisma} onChange={(v) => setValue('crisma', v)} />
              </div>
            </div>

            <div>
              <label className="label">Observação</label>
              <textarea {...register('observacao')} rows={2} className="input-field resize-none" />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancelar
          </button>
          {/* Batch mode: bypass react-hook-form validation */}
          {finalDeSemana && !editing ? (
            <button
              type="button"
              onClick={handleBatchSubmit}
              disabled={batchSaving}
              className="btn-primary"
            >
              {batchSaving
                ? 'Criando...'
                : `Criar ${batchForms.length} Celebração${batchForms.length !== 1 ? 'ões' : ''}`}
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Celebrações"
        subtitle={`${list.length} celebrações cadastradas`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={18} />
            Nova Celebração
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por data, período, horário..."
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
      </div>

      {/* Card rows list */}
      <div className="card overflow-hidden">
        {/* Desktop table header */}
        <table className="w-full hidden md:table">
          <thead>
            <tr className="bg-wine-900 text-white">
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Data</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Horário</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Período</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm hidden lg:table-cell">Tipo</th>
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Escala</th>
              <th className="text-right px-5 py-3.5 font-semibold text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Calendar size={28} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500">Nenhuma celebração encontrada</p>
                      {search && <p className="text-sm text-gray-400 mt-1">Tente outro termo de busca</p>}
                    </div>
                    {!search && (
                      <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 mt-1">
                        <Plus size={14} />
                        Nova Celebração
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const flags = getCelebrationFlags(c)
                return (
                  <tr
                    key={c.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <DateBox data={c.data} />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{formatData(c.data)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700 text-sm">
                        <Clock size={13} className="text-gray-400" />
                        {c.horario}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="wine" size="sm">{c.periodo_liturgico}</Badge>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {flags.length === 0 ? (
                          <span className="text-gray-400 text-xs">Comum</span>
                        ) : (
                          flags.map(({ label, variant }) => (
                            <Badge key={label} variant={variant} size="sm">{label}</Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.escala ? (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <CheckCircle2 size={15} />
                          <span className="text-xs font-medium">Tem escala</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <XCircle size={15} />
                          <span className="text-xs">Sem escala</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {!c.escala && (
                          <Link
                            to={`/escalas/nova?celebracao_id=${c.id}`}
                            className="text-xs font-semibold px-3 py-1.5 bg-wine-900 text-white rounded-lg hover:bg-wine-800 transition-colors"
                          >
                            Criar Escala
                          </Link>
                        )}
                        {c.escala && (
                          <Link
                            to={`/escalas/${c.escala.id}`}
                            className="text-xs font-semibold px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            Ver Escala
                          </Link>
                        )}
                        <button
                          onClick={() => openEdit(c)}
                          className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="skeleton h-5 rounded w-1/2" />
                <div className="skeleton h-4 rounded w-1/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhuma celebração</p>
            </div>
          ) : (
            filtered.map((c) => {
              const flags = getCelebrationFlags(c)
              return (
                <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <DateBox data={c.data} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-900 text-sm">{formatData(c.data)}</div>
                        {c.escala ? (
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} />{c.horario}
                        </span>
                        <Badge variant="wine" size="sm">{c.periodo_liturgico}</Badge>
                        {flags.slice(0, 2).map(({ label, variant }) => (
                          <Badge key={label} variant={variant} size="sm">{label}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {!c.escala && (
                      <Link
                        to={`/escalas/nova?celebracao_id=${c.id}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-wine-900 text-white rounded-lg hover:bg-wine-800 transition-colors"
                      >
                        Criar Escala
                      </Link>
                    )}
                    {c.escala && (
                      <Link
                        to={`/escalas/${c.escala.id}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-green-100 text-green-800 rounded-lg"
                      >
                        Ver Escala
                      </Link>
                    )}
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {FormModal}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Celebração"
        message={`Excluir a celebração de ${deleteTarget ? formatData(deleteTarget.data) : ''}?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal: reutilizar última escala */}
      {ultimaEscalaModal && ultimaEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setUltimaEscalaModal(false); navigate(`/escalas/nova?celebracao_id=${newCelebracaoId}`) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Copy size={22} className="text-wine-900" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Reutilizar última escala?</h3>
                <p className="text-sm text-gray-500">
                  Existe uma escala cadastrada.{' '}
                  <strong>Deseja copiá-la para esta nova celebração?</strong>{' '}
                  Você poderá editar os nomes depois.
                </p>
              </div>
            </div>

            {/* Preview da última escala */}
            {ultimaEscala.escala_itens && ultimaEscala.escala_itens.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                {ultimaEscala.escala_itens.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-semibold text-gray-900 w-24 flex-shrink-0 truncate">
                      {item.funcao_label ?? item.funcao?.titulo ?? 'Função'}
                    </span>
                    <span>{item.cerimoniario?.nome ?? '—'}</span>
                  </div>
                ))}
                {ultimaEscala.escala_itens.length > 8 && (
                  <p className="text-gray-400">+ {ultimaEscala.escala_itens.length - 8} mais...</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setUltimaEscalaModal(false); navigate(`/escalas/nova?celebracao_id=${newCelebracaoId}`) }}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Não, criar do zero
              </button>
              <button
                onClick={handleReutilizarEscala}
                className="flex-1 btn-primary text-sm"
              >
                <Copy size={15} />
                Sim, copiar escala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

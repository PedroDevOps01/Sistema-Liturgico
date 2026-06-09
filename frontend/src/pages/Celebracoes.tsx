import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Search, Pencil, Calendar, Clock, CheckCircle2, XCircle, Moon, X, Copy, MoreVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getPeriodoLiturgico, getPeriodoBadgeVariant } from '../lib/liturgico'
import type { Celebracao, Escala } from '../types'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ActionsDrawer from '../components/common/ActionsDrawer'
import InativosToggle from '../components/common/InativosToggle'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { SkeletonRow } from '../components/common/LoadingSpinner'

const PERIODOS = [
  'Advento',
  'Tempo do Natal',
  'Tempo Comum',
  'Quaresma',
  'Tríduo Pascal',
  'Tempo Pascal',
  'Pentecostes',
]

type FlagKey =
  | 'celebracao_noite' | 'celebracao_6h' | 'possui_bispo' | 'celebracao_palavra'
  | 'celebracao_solene' | 'casamento' | 'batismo' | 'crisma'
  | 'primeira_eucaristia' | 'adoracao_santissimo' | 'procissao' | 'via_sacra'
  | 'exequias' | 'vigilia_pascal' | 'paixao_senhor' | 'ordenacao'
  | 'santa_missa' | 'missa_crismal' | 'corpus_christi' | 'missa_pontifical'

const FLAG_OPTIONS: { key: FlagKey; label: string; group?: string }[] = [
  // Tipo da celebração
  { key: 'santa_missa',         label: 'Santa Missa',           group: 'tipo' },
  { key: 'celebracao_palavra',  label: 'Celebração da Palavra',  group: 'tipo' },
  { key: 'celebracao_solene',   label: 'Celebração Solene',      group: 'tipo' },
  { key: 'missa_pontifical',    label: 'Missa Pontifical',        group: 'tipo' },
  { key: 'missa_crismal',       label: 'Missa Crismal',           group: 'tipo' },
  // Sacramento / Rito especial
  { key: 'casamento',           label: 'Casamento',               group: 'rito' },
  { key: 'batismo',             label: 'Batismo',                 group: 'rito' },
  { key: 'crisma',              label: 'Crisma',                  group: 'rito' },
  { key: 'primeira_eucaristia', label: 'Primeira Eucaristia',     group: 'rito' },
  { key: 'ordenacao',           label: 'Ordenação',               group: 'rito' },
  { key: 'exequias',            label: 'Exéquias',                group: 'rito' },
  // Devoções / Outros
  { key: 'adoracao_santissimo', label: 'Adoração ao Santíssimo',  group: 'devocao' },
  { key: 'procissao',           label: 'Procissão',               group: 'devocao' },
  { key: 'corpus_christi',      label: 'Corpus Christi',          group: 'devocao' },
  { key: 'via_sacra',           label: 'Via-Sacra',              group: 'devocao' },
  // Datas solenes
  { key: 'vigilia_pascal',      label: 'Vigília Pascal',          group: 'solene' },
  { key: 'paixao_senhor',       label: 'Paixão do Senhor',        group: 'solene' },
  // Características
  { key: 'possui_bispo',        label: 'Possui Bispo',            group: 'carac' },
  { key: 'celebracao_6h',       label: 'Missa das 6h',            group: 'carac' },
]

const COR_LITURGICA_OPTIONS = [
  { value: '', label: 'Automático', dot: 'bg-gray-300' },
  { value: 'branco', label: 'Branco – Natal, Páscoa, Maria, Confessores', dot: 'bg-white border border-gray-300' },
  { value: 'vermelho', label: 'Vermelho – Pentecostes, Mártires, Apóstolos', dot: 'bg-red-600' },
  { value: 'roxo', label: 'Roxo – Advento, Quaresma, Finados', dot: 'bg-purple-700' },
  { value: 'verde', label: 'Verde – Tempo Comum', dot: 'bg-green-600' },
  { value: 'rosa', label: 'Rosa – Gaudete (3º Advento) / Laetare (4ª Quaresma)', dot: 'bg-pink-400' },
  { value: 'dourado', label: 'Dourado – Grandes Solenidades', dot: 'bg-amber-400' },
  { value: 'preto', label: 'Preto – Missas de Réquiem (tradicional)', dot: 'bg-gray-900' },
]

function getCorLiturgicaAutomatica(periodo_liturgico: string, flags: Partial<Record<FlagKey, boolean>>): string {
  if (flags.paixao_senhor || flags.missa_crismal || flags.crisma) return 'vermelho'
  if (flags.vigilia_pascal || flags.casamento || flags.batismo || flags.primeira_eucaristia || flags.ordenacao || flags.corpus_christi) return 'branco'
  if (flags.exequias) return 'roxo'
  switch (periodo_liturgico) {
    case 'Advento': case 'Quaresma': return 'roxo'
    case 'Tempo do Natal': case 'Tempo Pascal': return 'branco'
    case 'Pentecostes': case 'Tríduo Pascal': return 'vermelho'
    case 'Tempo Comum': return 'verde'
    default: return 'verde'
  }
}

const COR_DOT: Record<string, string> = {
  branco: 'bg-white border border-gray-400',
  vermelho: 'bg-red-600',
  roxo: 'bg-purple-700',
  verde: 'bg-green-600',
  rosa: 'bg-pink-400',
  dourado: 'bg-amber-400',
  preto: 'bg-gray-900',
}

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
  primeira_eucaristia: z.boolean(),
  adoracao_santissimo: z.boolean(),
  procissao: z.boolean(),
  via_sacra: z.boolean(),
  exequias: z.boolean(),
  vigilia_pascal: z.boolean(),
  paixao_senhor: z.boolean(),
  ordenacao: z.boolean(),
  santa_missa: z.boolean(),
  missa_crismal: z.boolean(),
  corpus_christi: z.boolean(),
  missa_pontifical: z.boolean(),
  cor_liturgica: z.string().optional(),
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
  primeira_eucaristia: false,
  adoracao_santissimo: false,
  procissao: false,
  via_sacra: false,
  exequias: false,
  vigilia_pascal: false,
  paixao_senhor: false,
  ordenacao: false,
  santa_missa: false,
  missa_crismal: false,
  corpus_christi: false,
  missa_pontifical: false,
  cor_liturgica: '',
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

function FlagsChips({
  values,
  onChange,
  exclude = [],
}: {
  values: Partial<Record<FlagKey, boolean>>
  onChange: (key: FlagKey, v: boolean) => void
  exclude?: FlagKey[]
}) {
  const options = FLAG_OPTIONS.filter((o) => !exclude.includes(o.key))
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ key, label }) => {
        const active = !!values[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key, !active)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 select-none ${
              active
                ? 'bg-wine-900 text-white border-wine-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-wine-800 hover:text-wine-900'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
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
  const [menuTarget, setMenuTarget] = useState<Celebracao | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)
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
      if (h >= 17) setValue('celebracao_noite', true)
    }
  }, [horario, setValue])

  // Auto detect periodo_liturgico when data changes
  const dataField = watch('data')
  useEffect(() => {
    if (dataField) {
      const { periodo } = getPeriodoLiturgico(dataField)
      setValue('periodo_liturgico', periodo)
    }
  }, [dataField, setValue])

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

      // Auto-detect periodo_liturgico when data changes
      if (field === 'data' && value) {
        const { periodo } = getPeriodoLiturgico(value)
        if (repetirDias) {
          return updated.map((f) => ({ ...f, data: value, periodo_liturgico: periodo }))
        }
        updated[idx].periodo_liturgico = periodo
        return updated
      }

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
        possui_bispo:         watchedData.possui_bispo         ?? false,
        celebracao_6h:        watchedData.celebracao_6h        ?? false,
        celebracao_palavra:   watchedData.celebracao_palavra   ?? false,
        celebracao_solene:    watchedData.celebracao_solene    ?? false,
        casamento:            watchedData.casamento            ?? false,
        batismo:              watchedData.batismo              ?? false,
        crisma:               watchedData.crisma               ?? false,
        primeira_eucaristia:  watchedData.primeira_eucaristia  ?? false,
        adoracao_santissimo:  watchedData.adoracao_santissimo  ?? false,
        procissao:            watchedData.procissao            ?? false,
        via_sacra:            watchedData.via_sacra            ?? false,
        exequias:             watchedData.exequias             ?? false,
        vigilia_pascal:       watchedData.vigilia_pascal       ?? false,
        paixao_senhor:        watchedData.paixao_senhor        ?? false,
        ordenacao:            watchedData.ordenacao            ?? false,
        santa_missa:          watchedData.santa_missa          ?? false,
        missa_crismal:        watchedData.missa_crismal        ?? false,
        corpus_christi:       watchedData.corpus_christi       ?? false,
        missa_pontifical:     watchedData.missa_pontifical     ?? false,
        cor_liturgica:        watchedData.cor_liturgica        ?? '',
        qtd_cerimoniarios:    watchedData.qtd_cerimoniarios    ?? 6,
        observacao:           watchedData.observacao           ?? '',
        final_de_semana:      true,
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
      const r = await api.get<Celebracao[]>('/celebracoes?todos=1')
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
    reset({ ...c, data: toDateInputValue(c.data), horario: c.horario.substring(0, 5), observacao: c.observacao ?? '', qtd_cerimoniarios: c.qtd_cerimoniarios, santa_missa: c.santa_missa ?? false, missa_crismal: c.missa_crismal ?? false, corpus_christi: c.corpus_christi ?? false, missa_pontifical: c.missa_pontifical ?? false, cor_liturgica: c.cor_liturgica ?? '' })
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
          possui_bispo:        data.possui_bispo,
          celebracao_6h:       data.celebracao_6h,
          celebracao_palavra:  data.celebracao_palavra,
          celebracao_solene:   data.celebracao_solene,
          casamento:           data.casamento,
          batismo:             data.batismo,
          crisma:              data.crisma,
          primeira_eucaristia: data.primeira_eucaristia,
          adoracao_santissimo: data.adoracao_santissimo,
          procissao:           data.procissao,
          via_sacra:           data.via_sacra,
          exequias:            data.exequias,
          vigilia_pascal:      data.vigilia_pascal,
          paixao_senhor:       data.paixao_senhor,
          ordenacao:           data.ordenacao,
          santa_missa:         data.santa_missa,
          missa_crismal:       data.missa_crismal,
          corpus_christi:      data.corpus_christi,
          missa_pontifical:    data.missa_pontifical,
          cor_liturgica:       data.cor_liturgica,
          qtd_cerimoniarios:   data.qtd_cerimoniarios,
          observacao:          data.observacao,
          final_de_semana:     true,
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
      const r = await api.post<{ id: number }>(`/escalas/${ultimaEscala.id}/duplicar`, { celebracao_id: newCelebracaoId })
      toast.success('Escala criada com base na última!')
      setUltimaEscalaModal(false)
      // Vai direto para visualizar a escala duplicada — sem precisar passar pelo formulário
      navigate(`/escalas/${r.data.id}`)
    } catch {
      toast.error('Erro ao duplicar escala')
      setUltimaEscalaModal(false)
    }
  }

  async function toggleAtivo(c: Celebracao) {
    try {
      await api.patch(`/celebracoes/${c.id}/toggle-ativo`)
      toast.success(c.ativo ? 'Celebração inativada' : 'Celebração ativada')
      loadList()
    } catch {
      toast.error('Erro ao alterar status')
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

  const inativos = list.filter((c) => !c.ativo)
  const filtered = list.filter((c) => {
    if (!mostrarInativos && !c.ativo) return false
    const term = search.toLowerCase()
    return (
      c.data.includes(term) ||
      c.periodo_liturgico.toLowerCase().includes(term) ||
      c.horario.includes(term)
    )
  })

  function getCelebrationFlags(c: Celebracao) {
    const flags = []
    if (c.santa_missa)         flags.push({ label: 'Santa Missa',        variant: 'wine'   as const })
    if (c.missa_pontifical)    flags.push({ label: 'Pontifical',          variant: 'purple' as const })
    if (c.missa_crismal)       flags.push({ label: 'Crismal',             variant: 'red'    as const })
    if (c.celebracao_noite)    flags.push({ label: 'Noite',              variant: 'blue'   as const })
    if (c.possui_bispo)        flags.push({ label: 'Bispo',              variant: 'purple' as const })
    if (c.celebracao_solene)   flags.push({ label: 'Solene',             variant: 'wine'   as const })
    if (c.celebracao_palavra)  flags.push({ label: 'Palavra',            variant: 'green'  as const })
    if (c.celebracao_6h)       flags.push({ label: '6h',                 variant: 'orange' as const })
    if (c.casamento)           flags.push({ label: 'Casamento',          variant: 'gold'   as const })
    if (c.batismo)             flags.push({ label: 'Batismo',            variant: 'blue'   as const })
    if (c.crisma)              flags.push({ label: 'Crisma',             variant: 'purple' as const })
    if (c.primeira_eucaristia) flags.push({ label: '1ª Eucaristia',      variant: 'gold'   as const })
    if (c.adoracao_santissimo) flags.push({ label: 'Adoração',           variant: 'purple' as const })
    if (c.corpus_christi)      flags.push({ label: 'Corpus Christi',     variant: 'gold'   as const })
    if (c.procissao)           flags.push({ label: 'Procissão',          variant: 'blue'   as const })
    if (c.via_sacra)           flags.push({ label: 'Via-Sacra',          variant: 'wine'   as const })
    if (c.exequias)            flags.push({ label: 'Exéquias',           variant: 'gray'   as const })
    if (c.vigilia_pascal)      flags.push({ label: 'Vigília Pascal',     variant: 'gold'   as const })
    if (c.paixao_senhor)       flags.push({ label: 'Paixão do Senhor',   variant: 'red'    as const })
    if (c.ordenacao)           flags.push({ label: 'Ordenação',          variant: 'purple' as const })
    return flags
  }

  function getCorLiturgicaDisplay(c: Celebracao): string {
    const manual = c.cor_liturgica
    if (manual) return manual
    return getCorLiturgicaAutomatica(c.periodo_liturgico, c as Partial<Record<FlagKey, boolean>>)
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
              <div className="bg-gray-50 rounded-xl p-4">
                <FlagsChips
                  values={watchedValues}
                  onChange={(key, v) => setValue(key as keyof FormData, v)}
                  exclude={['celebracao_noite']}
                />
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
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <FlagsChips
                  values={watchedValues}
                  onChange={(key, v) => {
                    setValue(key as keyof FormData, v)
                    if (key === 'celebracao_6h' && v) setValue('horario', '06:00')
                  }}
                />
              </div>
            </div>

            {/* Cor Litúrgica */}
            <div>
              <label className="label mb-1">Cor Litúrgica</label>
              <p className="text-xs text-gray-400 mb-2">
                Automático detecta a cor pelo período. Altere para dias solenes específicos conforme CNBB/Vaticano.
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {COR_LITURGICA_OPTIONS.map(opt => {
                  const isSelected = (watchedValues.cor_liturgica ?? '') === opt.value
                  const autoColor = opt.value === '' ? getCorLiturgicaAutomatica(watchedValues.periodo_liturgico, watchedValues) : null
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('cor_liturgica', opt.value)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-colors ${
                        isSelected
                          ? 'border-wine-700 bg-wine-50 text-wine-900 font-semibold'
                          : 'border-gray-200 hover:border-wine-300 text-gray-700'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 ${opt.dot}`} />
                      <span className="flex-1 text-left">{opt.label}</span>
                      {opt.value === '' && autoColor && (
                        <span className={`w-3 h-3 rounded-full ${COR_DOT[autoColor] ?? 'bg-gray-300'}`} title={`Automático: ${autoColor}`} />
                      )}
                    </button>
                  )
                })}
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
        <InativosToggle mostrarInativos={mostrarInativos} onChange={setMostrarInativos} count={inativos.length} />
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
              <th className="text-left px-5 py-3.5 font-semibold text-sm">Status</th>
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
                      <div className="flex items-center gap-2">
                        <span
                          title={`Cor litúrgica: ${getCorLiturgicaDisplay(c)}`}
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${COR_DOT[getCorLiturgicaDisplay(c)] ?? 'bg-gray-300'}`}
                        />
                        <Badge variant={getPeriodoBadgeVariant(c.periodo_liturgico)} size="sm">{c.periodo_liturgico}</Badge>
                      </div>
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
                      <Badge variant={c.ativo ? 'green' : 'red'} size="sm">
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
                        <Badge variant={getPeriodoBadgeVariant(c.periodo_liturgico)} size="sm">{c.periodo_liturgico}</Badge>
                        {flags.slice(0, 2).map(({ label, variant }) => (
                          <Badge key={label} variant={variant} size="sm">{label}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setMenuTarget(c)}
                      className="p-2 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                      title="Ações"
                    >
                      <MoreVertical size={18} />
                    </button>
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
        title="Inativar Celebração"
        message={`Inativar a celebração de ${deleteTarget ? formatData(deleteTarget.data) : ''}?`}
        confirmLabel="Inativar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Actions Drawer */}
      <ActionsDrawer
        isOpen={!!menuTarget}
        onClose={() => setMenuTarget(null)}
        title={menuTarget ? formatData(menuTarget.data) : ''}
        subtitle={menuTarget ? `${menuTarget.horario.substring(0, 5)} · ${menuTarget.periodo_liturgico}` : ''}
        actions={menuTarget ? [
          ...(!menuTarget.escala ? [{
            label: 'Criar Escala',
            icon: <Calendar size={18} />,
            onClick: () => navigate(`/escalas/nova?celebracao_id=${menuTarget.id}`),
            variant: 'success' as const,
          }] : [{
            label: 'Ver Escala',
            icon: <CheckCircle2 size={18} />,
            onClick: () => navigate(`/escalas/${menuTarget.escala!.id}`),
            variant: 'success' as const,
          }]),
          {
            label: 'Editar',
            icon: <Pencil size={18} />,
            onClick: () => openEdit(menuTarget),
            separator: true,
          },
          {
            label: menuTarget.ativo ? 'Inativar' : 'Ativar',
            icon: menuTarget.ativo ? <ToggleLeft size={18} /> : <ToggleRight size={18} />,
            onClick: () => toggleAtivo(menuTarget),
            variant: menuTarget.ativo ? 'warning' as const : 'success' as const,
            separator: true,
          },
        ] : []}
      />

      {/* Modal: reutilizar última escala */}
      {ultimaEscalaModal && ultimaEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUltimaEscalaModal(false)} />
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
                onClick={() => {
                  setUltimaEscalaModal(false)
                  navigate(`/escalas/nova?celebracao_id=${newCelebracaoId}`)
                }}
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

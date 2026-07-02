import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Search, Pencil, Calendar, Clock, CheckCircle2, XCircle, Moon, X, Copy, MoreVertical, ToggleLeft, ToggleRight, Users, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../lib/api'
import { getPeriodoLiturgico, getPeriodoBadgeVariant } from '../lib/liturgico'
import type { Celebracao, Escala } from '../types'
import type { FlagKey } from '../lib/celebracaoUtils'
import { getQtdCerimoniariosDefault, mapTipoParaFlags, resolverTipoLabel, TIPO_CELEBRACAO_OPCOES, PERIODOS_LITURGICOS, pluralizar } from '../lib/celebracaoUtils'
import Modal from '../components/common/Modal'
import CelebracaoImportPreview from '../components/celebracoes/CelebracaoImportPreview'
import type { CelebracaoPreviewRow, CelebracaoImportResultado } from '../components/celebracoes/CelebracaoImportPreview'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ActionsDrawer from '../components/common/ActionsDrawer'
import InativosToggle from '../components/common/InativosToggle'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import SelectField from '../components/common/SelectField'
import CalcNote from '../components/common/CalcNote'
import { SkeletonRow } from '../components/common/LoadingSpinner'

const PERIODOS = PERIODOS_LITURGICOS

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
  { key: 'quinta_eucaristica',  label: 'Quinta Eucarística',      group: 'rito' },
  { key: 'ordenacao',           label: 'Ordenação',               group: 'rito' },
  { key: 'exequias',            label: 'Exéquias',                group: 'rito' },
  // Devoções / Outros
  { key: 'adoracao_santissimo', label: 'Adoração ao Santíssimo',  group: 'devocao' },
  { key: 'procissao',           label: 'Procissão',               group: 'devocao' },
  { key: 'corpus_christi',      label: 'Corpus Christi',          group: 'devocao' },
  { key: 'via_sacra',           label: 'Via-Sacra',              group: 'devocao' },
  { key: 'triduo',              label: 'Tríduo',                  group: 'devocao' },
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
  quinta_eucaristica: z.boolean(),
  triduo: z.boolean(),
  cor_liturgica: z.string().optional(),
  observacao: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const defaultFormValues: FormData = {
  data: '',
  horario: '',
  periodo_liturgico: 'Tempo Comum',
  qtd_cerimoniarios: 5,
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
  quinta_eucaristica: false,
  triduo: false,
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

// ─── CSV import ──────────────────────────────────────────────────────────

function parseDataCSV(raw: string): string | undefined {
  const s = raw.trim()
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const [, d, m, y] = br
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return undefined
}

function parseHorarioCSV(raw: string): string | undefined {
  const s = raw.trim().toLowerCase()
  let m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  m = s.match(/^(\d{1,2})h(\d{2})?$/)
  if (m) return `${m[1].padStart(2, '0')}:${(m[2] ?? '00').padStart(2, '0')}`
  return undefined
}

function parseCelebracaoCSV(text: string): CelebracaoPreviewRow[] {
  const lines = text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split('\n')

  if (lines.length < 2) return []

  const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line, i) => {
      const values = line.split(/[,;]/).map((v) => v.trim().replace(/^["']|["']$/g, ''))
      const get = (key: string) => {
        const idx = headers.indexOf(key)
        return idx >= 0 ? values[idx]?.trim() || undefined : undefined
      }

      const rawData = get('data') ?? ''
      const rawHorario = get('horario') ?? ''
      const data = parseDataCSV(rawData)
      const horario = parseHorarioCSV(rawHorario)
      const tipo = resolverTipoLabel(get('tipo'), { fuzzy: true })

      const rawPeriodo = get('periodo_liturgico') ?? get('periodo') ?? get('período')
      const periodoMatch = rawPeriodo
        ? PERIODOS_LITURGICOS.find((p) => p.toLowerCase() === rawPeriodo.toLowerCase())
        : undefined
      const periodo_liturgico = periodoMatch ?? (data ? getPeriodoLiturgico(data).periodo : undefined)

      const rawQtd = get('qtd_cerimoniarios') ?? get('qtd') ?? get('cerimoniarios')
      const qtdParsed = rawQtd ? parseInt(rawQtd, 10) : NaN
      const qtd_cerimoniarios = Number.isFinite(qtdParsed) && qtdParsed > 0
        ? qtdParsed
        : (horario ? getQtdCerimoniariosDefault(horario) : undefined)

      let erro: string | undefined
      if (!data) erro = `Data inválida: "${rawData}"`
      else if (!horario) erro = `Horário inválido: "${rawHorario}"`

      return {
        _key: `csv-${i}-${Math.random().toString(36).slice(2)}`,
        data: data ?? '',
        horario: horario ?? '',
        tipo,
        periodo_liturgico,
        qtd_cerimoniarios,
        observacao: get('observacao') ?? get('obs'),
        erro,
      }
    })
}

function downloadTemplateCelebracoes() {
  const rows = [
    'data,horario,tipo,periodo_liturgico,qtd_cerimoniarios,observacao',
    '05/07/2026,09:30,Missa,Tempo Comum,5,',
    '09/07/2026,19:30,Quinta Eucarística,Tempo Comum,6,Diácono Samuel',
    '26/07/2026,17:00,Casamento,Tempo Comum,6,Ítalo e Laurícia',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_celebracoes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Celebracoes() {
  const navigate = useNavigate()
  const location = useLocation()
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
  // Import CSV
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<CelebracaoPreviewRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResultado, setCsvResultado] = useState<CelebracaoImportResultado | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<FormData>({ resolver: zodResolver(schema) as any, defaultValues: defaultFormValues })

  const watchedValues = watch()

  // Auto set celebracao_noite + qtd_cerimoniarios when horario changes
  const horario = watch('horario')
  useEffect(() => {
    if (horario) {
      const [h] = horario.split(':').map(Number)
      setValue('celebracao_noite', h >= 17)
      setValue('qtd_cerimoniarios', getQtdCerimoniariosDefault(horario))
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
        return {
          ...flags,
          data: bf.data,
          horario: bf.horario,
          periodo_liturgico: bf.periodo_liturgico,
          celebracao_noite: h >= 17,
          qtd_cerimoniarios: getQtdCerimoniariosDefault(bf.horario || '00:00'),
        }
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

  // ─── CSV import ─────────────────────────────────────────────────────────

  function handleCsvFile(file: File) {
    setCsvError(null)
    setCsvResultado(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCelebracaoCSV(text)
      if (rows.length === 0) {
        setCsvError('Nenhum dado válido encontrado. Verifique o formato do arquivo.')
      }
      setCsvRows(rows)
    }
    reader.onerror = () => setCsvError('Erro ao ler o arquivo.')
    reader.readAsText(file, 'UTF-8')
  }

  function closeCsvModal() {
    setCsvModalOpen(false)
    setCsvRows([])
    setCsvError(null)
    setCsvResultado(null)
  }

  async function confirmarImportCsv() {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    try {
      const payload = csvRows.map((r) => ({
        data: r.data,
        horario: r.horario,
        periodo_liturgico: r.periodo_liturgico || (r.data ? getPeriodoLiturgico(r.data).periodo : undefined),
        qtd_cerimoniarios: r.qtd_cerimoniarios ?? (r.horario ? getQtdCerimoniariosDefault(r.horario) : undefined),
        observacao: r.observacao || null,
        ...mapTipoParaFlags(r.tipo),
      }))
      const resultado = await api.post<CelebracaoImportResultado>('/celebracoes/import', { celebracoes: payload })

      setCsvResultado(resultado.data)
      setCsvRows((prev) => prev.map((r, i) => {
        const erro = resultado.data.erros.find((e) => e.indice === i)
        return erro ? { ...r, erro: Object.values(erro.erros).flat().join(' ') } : { ...r, erro: undefined }
      }))

      if (resultado.data.criadas.length) {
        const n = resultado.data.criadas.length
        toast.success(`${n} ${pluralizar(n, 'celebração importada', 'celebrações importadas')}!`)
      }
      if (resultado.data.puladas.length) {
        const n = resultado.data.puladas.length
        toast(`${n} ${pluralizar(n, 'já existia e foi pulada', 'já existiam e foram puladas')}.`)
      }
      if (resultado.data.erros.length) {
        const n = resultado.data.erros.length
        toast.error(`${n} ${pluralizar(n, 'linha com erro', 'linhas com erro')} — corrija e tente novamente.`)
      } else closeCsvModal()

      loadList()
    } catch {
      toast.error('Erro ao importar celebrações')
    } finally {
      setCsvImporting(false)
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

  // Abre o drawer de ações da celebração passada via state (ex: clique na timeline do dashboard)
  useEffect(() => {
    const id = (location.state as { openCelebracaoId?: number } | null)?.openCelebracaoId
    if (!id || list.length === 0) return
    const cel = list.find(c => c.id === id)
    if (cel) {
      setMenuTarget(cel)
      window.history.replaceState({}, '')
    }
  }, [list, location.state])

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
          quinta_eucaristica:  data.quinta_eucaristica,
          triduo:              data.triduo,
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
  function isDatePast(data: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return parseDate(data) < today
  }

  const filtered = list
    .filter((c) => {
      if (!mostrarInativos && !c.ativo) return false
      const term = search.toLowerCase()
      return (
        c.data.includes(term) ||
        c.periodo_liturgico.toLowerCase().includes(term) ||
        c.horario.includes(term)
      )
    })
    .sort((a, b) => {
      const dA = parseDate(a.data)
      const dB = parseDate(b.data)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const pastA = dA < today
      const pastB = dB < today
      if (pastA && !pastB) return 1
      if (!pastA && pastB) return -1
      if (pastA && pastB) return dB.getTime() - dA.getTime()
      return dA.getTime() - dB.getTime()
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

  // isNight kept for potential future use (slot banner uses horario directly)

  const FormModal = (
    <Modal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      title={editing ? 'Editar Celebração' : 'Nova Celebração'}
      size="2xl"
      footer={<>
        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
        {finalDeSemana && !editing ? (
          <button type="button" onClick={handleBatchSubmit} disabled={batchSaving} className="btn-primary">
            {batchSaving ? 'Criando...' : `Criar ${batchForms.length} Celebração${batchForms.length !== 1 ? 'ões' : ''}`}
          </button>
        ) : (
          <button type="submit" form="form-celebracao" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
          </button>
        )}
      </>}
    >
      <form id="form-celebracao" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Final de Semana toggle (only when creating) */}
        <CalcNote items={[
              {
                label: 'Horário < 18h',
                formula: '5 cerimoniários',
                note: 'Mestre · 1AUX · 2AUX · 3AUX · 4AUX — gerado automaticamente na escala.',
              },
              {
                label: 'Horário ≥ 18h',
                formula: '6 cerimoniários',
                note: 'Mestre · 1AUX · 2AUX · 3AUX · 4AUX · Turiferário — slot extra gerado automaticamente.',
              },
              {
                label: 'Possui Bispo',
                formula: '+3 extra: Môr · Mitra · Bácula',
                note: 'Adicionados além dos 5 ou 6 padrão, independentemente do horário.',
              },
              {
                label: 'Casamento · Batismo · Crisma · Via Sacra etc.',
                formula: 'Somente Mestre pré-preenchido',
                note: 'Eventos especiais: demais funções ficam em branco para preenchimento manual.',
              },
            ]} />
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
                const batchHour = bf.horario ? Number(bf.horario.split(':')[0]) : -1
                const qtdBatch = batchHour >= 18 ? 6 : 5
                return (
                  <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-wine-900">Celebração {idx + 1}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <SelectField
                        value={bf.periodo_liturgico}
                        onChange={(e) => updateBatchForm(idx, 'periodo_liturgico', e.target.value)}
                      >
                        {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </SelectField>
                    </div>
                    {bf.horario && (
                      <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${
                        batchHour >= 18
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                          : 'bg-gray-50 border border-gray-200 text-gray-500'
                      }`}>
                        {batchHour >= 18 ? <Moon size={12} className="flex-shrink-0" /> : <Users size={12} className="flex-shrink-0" />}
                        <span>
                          {batchHour >= 18
                            ? `${qtdBatch} cer. · Mestre + 4 Aux + Turiferário`
                            : `${qtdBatch} cerimoniários · Mestre + 4 Aux`
                          }
                        </span>
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
              <label className="label">Observação</label>
              <textarea {...register('observacao')} rows={2} className="input-field resize-none" />
            </div>

            {/* Regras automáticas — lote */}
            <CalcNote items={[
              {
                label: 'Qtd. cerimoniários',
                formula: 'auto por horário de cada celebração',
                note: '< 18h → 5 slots (Mestre + 4 Aux); ≥ 18h → 6 slots (+ Turiferário).',
              },
              {
                label: 'Possui Bispo',
                formula: '+3 extra: Môr · Mitra · Bácula',
                note: 'Acrescentados em todas as celebrações do lote se a opção estiver ativa.',
              },
              {
                label: 'Casamento · Batismo etc.',
                formula: 'Somente Mestre pré-preenchido',
                note: 'Eventos especiais: demais funções ficam em branco para preenchimento manual.',
              },
            ]} />
          </>
        ) : (
          <>
            {/* Single mode: original fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Slot preview banner — sempre visível quando horário está preenchido */}
            {horario && (
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${
                Number(horario.split(':')[0]) >= 18
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-600'
              }`}>
                {Number(horario.split(':')[0]) >= 18 ? <Moon size={15} className="flex-shrink-0" /> : <Users size={15} className="flex-shrink-0" />}
                <span>
                  {Number(horario.split(':')[0]) >= 18
                    ? <><strong>6 cerimoniários:</strong> Mestre · 1AUX · 2AUX · 3AUX · 4AUX · Turiferário</>
                    : <><strong>5 cerimoniários:</strong> Mestre · 1AUX · 2AUX · 3AUX · 4AUX</>
                  }
                </span>
                <span className="ml-auto text-xs opacity-60 flex-shrink-0">auto-detectado</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Período Litúrgico *</label>
                <SelectField {...register('periodo_liturgico')}>
                  {PERIODOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <label className="label">
                  Qtd. Cerimoniários
                  <span className="ml-1.5 text-xs font-normal text-wine-400">(ajuste se necessário)</span>
                </label>
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

            {/* Regras automáticas da celebração */}
            
          </>
        )}

      </form>
    </Modal>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Celebrações"
        subtitle={`${list.length} celebrações cadastradas`}
        action={
          <>
            <button onClick={() => setCsvModalOpen(true)} className="btn-secondary">
              <Upload size={16} />
              Importar CSV
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus size={18} />
              Nova Celebração
            </button>
          </>
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
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] hidden md:table">
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
                          {isDatePast(c.data) && (
                            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                              Data passada
                            </span>
                          )}
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
        </div>

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
                        {isDatePast(c.data) && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                            Data passada
                          </span>
                        )}
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

      {/* ─── CSV Import Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={csvModalOpen}
        onClose={closeCsvModal}
        title="Importar Celebrações por CSV"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Formato esperado do CSV:</p>
            <code className="text-xs bg-blue-100 px-2 py-0.5 rounded">
              data, horario, tipo, periodo_liturgico, qtd_cerimoniarios, observacao
            </code>
            <p className="mt-1.5 text-xs text-blue-600">
              Data no formato <strong>DD/MM/AAAA</strong>, horário em <strong>HH:mm</strong>.
              O <strong>tipo</strong> é opcional — deixe em branco (ou "Missa") para uma missa comum,
              ou escreva exatamente uma destas características:
            </p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              {TIPO_CELEBRACAO_OPCOES.filter((t) => t !== 'Missa').join(' · ')}
            </p>
            <p className="mt-1.5 text-xs text-blue-600">
              <strong>periodo_liturgico</strong> e <strong>qtd_cerimoniarios</strong> também são
              opcionais — se deixados em branco, são calculados automaticamente a partir da data e do
              horário (e continuam editáveis na pré-visualização antes de confirmar). Se preencher o
              período manualmente, use exatamente um destes:
            </p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              {PERIODOS_LITURGICOS.join(' · ')}
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplateCelebracoes}
            className="flex items-center gap-2 text-sm text-wine-700 hover:text-wine-900 font-medium transition-colors"
          >
            <Download size={16} />
            Baixar modelo CSV
          </button>

          <label
            htmlFor="celebracoes-csv-file-input"
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-wine-400 hover:bg-wine-50/30 transition-colors"
          >
            <Upload size={32} className="text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Clique para selecionar o arquivo</p>
              <p className="text-xs text-gray-400 mt-0.5">Apenas arquivos .csv</p>
            </div>
            <input
              id="celebracoes-csv-file-input"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]) }}
            />
          </label>

          {csvError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {csvError}
            </p>
          )}

          {csvRows.length > 0 && (
            <CelebracaoImportPreview
              rows={csvRows}
              onChange={setCsvRows}
              onConfirm={confirmarImportCsv}
              confirming={csvImporting}
              resultado={csvResultado}
            />
          )}
        </div>
      </Modal>

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
      <Modal
        isOpen={ultimaEscalaModal && !!ultimaEscala}
        onClose={() => setUltimaEscalaModal(false)}
        title="Reutilizar última escala?"
        size="sm"
        footer={
          <>
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
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Existe uma escala cadastrada.{' '}
            <strong className="text-gray-700">Deseja copiá-la para esta nova celebração?</strong>{' '}
            Você poderá editar os nomes depois.
          </p>

          {/* Preview da última escala */}
          {ultimaEscala?.escala_itens && ultimaEscala.escala_itens.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5 max-h-48 overflow-y-auto">
              {ultimaEscala.escala_itens.slice(0, 8).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-semibold text-gray-800 w-24 flex-shrink-0 truncate">
                    {item.funcao_label ?? item.funcao?.titulo ?? 'Função'}
                  </span>
                  <span className="text-gray-600">{item.cerimoniario?.nome ?? '—'}</span>
                </div>
              ))}
              {ultimaEscala.escala_itens.length > 8 && (
                <p className="text-gray-400 pt-1">+ {ultimaEscala.escala_itens.length - 8} mais...</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

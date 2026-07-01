import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatHorario } from '../lib/dateUtils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  Send,
  FileDown,
  ChevronLeft,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  LayoutGrid,
  LayoutList,
  Info,
  X,
} from 'lucide-react'
import api from '../lib/api'
import type { Celebracao, Cerimoniario, EscalaItem } from '../types'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import SearchableSelect from '../components/common/SearchableSelect'
import type { SelectOption } from '../components/common/SearchableSelect'
import SelectField from '../components/common/SelectField'

// Rótulos canônicos dos slots — usados tanto nas opções do SelectField quanto no buildStructure
const FUNCOES_LABELS = [
  'Mestre',
  '1º Auxiliar',
  '2º Auxiliar',
  '3º Auxiliar',
  '4º Auxiliar',
  'Turiferário',
  'Môr',
  'Mitra',
  'Bácula',
]

// Mapeamento funcao_id → rótulo canônico (evita depender do titulo do DB)
const FUNCAO_ID_TO_LABEL: Record<number, string> = {
  1: 'Mestre',
  2: '1º Auxiliar',
  3: '2º Auxiliar',
  4: '3º Auxiliar',
  5: '4º Auxiliar',
  6: 'Turiferário',
  7: 'Môr',
  8: 'Mitra',
  9: 'Bácula',
}

const FUNCAO_LABELS = FUNCOES_LABELS

function buildStructure(c: Celebracao): Omit<EscalaItem, 'id'>[] {
  const base: Omit<EscalaItem, 'id'>[] = []

  base.push({ funcao_label: 'Mestre', ordem: 0 })

  const isSpecial = c.celebracao_6h || c.celebracao_palavra || c.celebracao_solene
    || c.casamento || c.batismo || c.crisma
    || c.primeira_eucaristia || c.adoracao_santissimo || c.procissao
    || c.via_sacra || c.exequias || c.vigilia_pascal || c.paixao_senhor || c.ordenacao

  if (!isSpecial) {
    for (let i = 1; i <= 4; i++) {
      base.push({ funcao_label: `${i}º Auxiliar`, ordem: base.length })
    }
  }

  // Noturno sempre adiciona Turiferário (independente de ser especial ou não)
  if (c.celebracao_noite) {
    base.push({ funcao_label: 'Turiferário', ordem: base.length })
  }

  // Trimma/completa até qtd_cerimoniarios
  const qty = c.qtd_cerimoniarios ?? base.length
  const result = base.slice(0, qty)
  while (result.length < qty) {
    // Preenche slots extras com rótulo sequencial ou vazio
    const label = FUNCAO_LABELS[result.length] ?? ''
    result.push({ funcao_label: label, ordem: result.length })
  }

  // Bispo adiciona Môr, Mitra e Bácula ALÉM do qtd base
  if (c.possui_bispo) {
    result.push({ funcao_label: 'Môr',    ordem: result.length })
    result.push({ funcao_label: 'Mitra',  ordem: result.length })
    result.push({ funcao_label: 'Bácula', ordem: result.length })
  }

  return result.map((item, i) => ({ ...item, ordem: i }))
}

function safeParseDate(raw: string): Date {
  const s = raw.substring(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatData(data: string) {
  try {
    return format(safeParseDate(data), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })
  } catch {
    return data
  }
}

function getAvailabilityInfo(cerimoniario: Cerimoniario, celebracao: Celebracao): { status: 'available' | 'busy' | 'unavailable'; label: string } {
  if (cerimoniario.indisponivel_temporario) {
    return { status: 'unavailable', label: '(indisponível)' }
  }
  const [h] = celebracao.horario.split(':').map(Number)
  const isManha = h < 12
  const isTarde = h >= 12 && h < 18
  const isNoite = h >= 18

  const dayOfWeek = new Date(celebracao.data + 'T00:00:00').getDay()
  const isDomingo = dayOfWeek === 0
  const isSabado = dayOfWeek === 6

  let available = false
  if (isDomingo) {
    if (isManha) available = cerimoniario.disponivel_domingo_manha
    else if (isTarde) available = cerimoniario.disponivel_domingo_tarde
    else if (isNoite) available = cerimoniario.disponivel_domingo_noite
  } else if (isSabado) {
    available = cerimoniario.disponivel_sabado
  } else {
    if (isManha) available = cerimoniario.disponivel_semana_manha
    else if (isTarde) available = cerimoniario.disponivel_semana_tarde
    else if (isNoite) available = cerimoniario.disponivel_semana_noite
  }

  if (!available) return { status: 'busy', label: '(fora do horário habitual)' }
  return { status: 'available', label: '(livre)' }
}

// Sortable Row component
function SortableRow({
  item,
  index,
  cerimoniarios,
  celebracao,
  onChange,
  onRemove,
  hasDuplicateCerimoniario,
  conflicts,
}: {
  item: EscalaItem
  index: number
  cerimoniarios: Cerimoniario[]
  celebracao: Celebracao
  onChange: (id: string, field: 'funcao_label' | 'cerimoniario_id', value: string | number | undefined) => void
  onRemove: (id: string) => void
  hasDuplicateCerimoniario: boolean
  conflicts: Array<{ horario: string; periodo_liturgico: string }>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const selectedCerimoniario = cerimoniarios.find((c) => c.id === item.cerimoniario_id)

  // Funções que exigem cerimoniário experiente ou mestre
  const fl = (item.funcao_label ?? '').toLowerCase()
  const isExperiencedRole = fl.includes('mestre') || fl === '2º auxiliar' || fl.includes('turif')
  const cersForRole = isExperiencedRole
    ? cerimoniarios.filter((c) => c.experiente || c.mestre)
    : cerimoniarios

  // Build options for SearchableSelect
  const cerOptions: SelectOption[] = cersForRole.map((c) => {
    const avail = getAvailabilityInfo(c, celebracao)
    let status: SelectOption['status'] = avail.status
    // If there are conflicts for this cerimoniario, show conflict status
    // (we check from outside via conflictMap, but for the dropdown we only have per-row conflicts;
    // to colour all options we'd need the full conflictMap — for now use avail status)
    if (avail.status === 'available') status = 'available'
    else if (avail.status === 'busy') status = 'busy'
    else status = 'unavailable'
    return {
      value: c.id,
      label: c.nome,
      subLabel: avail.label,
      status,
    }
  })

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className={`p-3 rounded-xl border-2 transition-all duration-200 ${
          isDragging
            ? 'bg-white border-wine-400 shadow-xl opacity-80 z-10'
            : hasDuplicateCerimoniario
            ? 'bg-red-50 border-red-300'
            : conflicts.length > 0
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Top row: drag handle + badge + selects + remove */}
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none p-0.5"
            aria-label="Arrastar"
          >
            <GripVertical size={18} />
          </button>

          {/* Order badge */}
          <div className="w-6 h-6 rounded-full bg-wine-100 text-wine-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </div>

          {/* Selects: stacked on mobile, side-by-side on sm+ */}
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Function Label */}
            <div className="sm:w-44 sm:flex-shrink-0">
              <SelectField
                value={item.funcao_label || ''}
                onChange={(e) => onChange(item.id, 'funcao_label', e.target.value)}
              >
                <option value="">— Função —</option>
                <optgroup label="Funções padrão">
                  {FUNCOES_LABELS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
              </SelectField>
            </div>

            {/* Cerimoniário + availability */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={cerOptions}
                  value={item.cerimoniario_id ?? null}
                  onChange={(val) => onChange(item.id, 'cerimoniario_id', val)}
                  placeholder="— Cerimoniário —"
                />
              </div>
              {selectedCerimoniario && (() => {
                const avail = getAvailabilityInfo(selectedCerimoniario, celebracao)
                const hasConflict = conflicts.length > 0
                return (
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      hasConflict
                        ? 'bg-orange-500'
                        : avail.status === 'available'
                        ? 'bg-green-500'
                        : avail.status === 'busy'
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    }`}
                    title={hasConflict ? 'Já escalado neste dia' : avail.label}
                  />
                )
              })()}
            </div>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Remover"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Conflict warning row */}
      {selectedCerimoniario && conflicts.length > 0 && (
        <div className="mt-1 ml-14 flex flex-wrap gap-1">
          {conflicts.map((cf, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-lg border border-amber-200"
            >
              ⚠️ {selectedCerimoniario.nome} já está na escala das {cf.horario} - {cf.periodo_liturgico}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Flag badge helper
function CelebracaoFlags({ c }: { c: Celebracao }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {c.celebracao_noite && <Badge variant="blue" size="sm">Noite</Badge>}
      {c.possui_bispo && <Badge variant="purple" size="sm">Bispo</Badge>}
      {c.celebracao_6h && <Badge variant="orange" size="sm">6h</Badge>}
      {c.celebracao_palavra && <Badge variant="green" size="sm">Palavra</Badge>}
      {c.celebracao_solene && <Badge variant="wine" size="sm">Solene</Badge>}
      {c.casamento && <Badge variant="gold" size="sm">Casamento</Badge>}
      {c.batismo && <Badge variant="blue" size="sm">Batismo</Badge>}
      {c.crisma && <Badge variant="purple" size="sm">Crisma</Badge>}
    </div>
  )
}

function abbreviateFuncao(label: string | null | undefined): string {
  if (!label) return 'Função'
  const l = label.toLowerCase()
  if (l.includes('mestre'))                                                           return 'Mestre'
  if (l.includes('1') && l.includes('aux') || l.includes('primeiro') || l.includes('microfone')) return '1º Aux'
  if (l.includes('2') && l.includes('aux') || l.includes('segundo')  || l.includes('missal'))    return '2º Aux'
  if (l.includes('3') && l.includes('aux') || l.includes('terceiro') || l.includes('leitor'))    return '3º Aux'
  if (l.includes('4') && l.includes('aux') || l.includes('quarto')   || l.includes('prece'))     return '4º Aux'
  if (l.includes('5') && l.includes('aux') || l.includes('quinto')   || l.includes('turifer'))   return 'Turífer.'
  if (l.includes('môr') || l === 'mor')   return 'Môr'
  if (l.includes('mitra'))                return 'Mitra'
  if (l.includes('bácula') || l.includes('bacula')) return 'Bácula'
  return label
}

function horarioCompact(raw: string): string {
  const [h, m] = raw.substring(0, 5).split(':').map(Number)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function getTipoCelebracao(c: Celebracao): string {
  if (c.casamento)          return 'Casamento'
  if (c.batismo)            return 'Batismo'
  if (c.crisma)             return 'Crisma'
  if (c.celebracao_palavra) return 'Celebração da Palavra'
  if (c.celebracao_solene)  return 'Missa Solene'
  return 'Missa'
}

function buildWhatsAppText(celebracao: Celebracao, items: EscalaItem[]): string {
  const periodo  = celebracao.periodo_liturgico.toUpperCase()
  const data     = celebracao.data.substring(0, 10).split('-').reverse().slice(0, 2).join('/')  // DD/MM
  const horario  = horarioCompact(celebracao.horario)
  const tipo     = getTipoCelebracao(celebracao)

  const lines: string[] = [
    periodo,
    `DIA ${data} - ${celebracao.periodo_liturgico}`,
    `${tipo} às ${horario}`,
    '',
  ]

  for (const item of items) {
    const label = abbreviateFuncao(item.funcao_label ?? item.funcao?.titulo)
    const nome  = item.cerimoniario?.nome ?? 'A escalar'
    lines.push(`${label}: ${nome}`)
  }

  return lines.join('\n').trim()
}

// ─── Grid View ───────────────────────────────────────────────────────────────

function GridView({
  items,
  cerimoniarios,
  celebracao,
  onAssign,
  conflictMap,
}: {
  items: EscalaItem[]
  cerimoniarios: Cerimoniario[]
  celebracao: Celebracao
  onAssign: (itemId: string, cerimoniarioId: number | undefined) => void
  conflictMap: Record<number, Array<{ horario: string; periodo_liturgico: string }>>
}) {
  return (
    <div className="overflow-x-auto overflow-y-auto -mx-1 max-h-[420px]">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-1.5 font-semibold text-gray-600 sticky left-0 top-0 bg-gray-50 min-w-36 z-30">
              Cerimoniário
            </th>
            {items.map((item, idx) => (
              <th key={item.id} className="px-1 py-0.1 text-center min-w-14 bg-gray-50">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold text-wine-400">{idx + 1}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{abbreviateFuncao(item.funcao_label)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cerimoniarios.map((cer) => {
            const avail = getAvailabilityInfo(cer, celebracao)
            const hasConflict = (conflictMap[cer.id]?.length ?? 0) > 0
            const assignedCount = items.filter(i => i.cerimoniario_id === cer.id).length
            return (
              <tr key={cer.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      hasConflict    ? 'bg-orange-500' :
                      avail.status === 'available'   ? 'bg-green-500' :
                      avail.status === 'busy'        ? 'bg-amber-400' :
                                                       'bg-red-500'
                    }`} />
                    <span className={`font-medium text-sm ${assignedCount > 0 ? 'text-wine-900' : 'text-gray-700'}`}>
                      {cer.nome}
                    </span>
                  </div>
                </td>
                {items.map((item) => {
                  const isAssigned = item.cerimoniario_id === cer.id
                  return (
                    <td key={item.id} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onAssign(item.id, isAssigned ? undefined : cer.id)}
                        title={isAssigned ? 'Remover' : `Atribuir ${cer.nome}`}
                        className={[
                          'w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto',
                          'transition-all duration-150 active:scale-90',
                          isAssigned
                            ? 'bg-wine-700 border-wine-700 text-white shadow-sm'
                            : 'bg-white border-gray-200 hover:border-wine-400 hover:bg-wine-50',
                        ].join(' ')}
                      >
                        {isAssigned && <Check size={12} strokeWidth={3} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Step indicator
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'Celebração' },
    { num: 2, label: 'Montar Escala' },
    { num: 3, label: 'Exportar' },
  ]
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-1 sm:gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            current === step.num
              ? 'bg-wine-900 text-white'
              : current > step.num
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {current > step.num ? <CheckCircle2 size={12} /> : <span>{step.num}</span>}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-4 sm:w-8 h-0.5 rounded-full transition-all duration-200 ${current > step.num ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function EscalaForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = !!id && id !== 'nova'

  const [celebracoes, setCelebracoes] = useState<Celebracao[]>([])
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [selectedCelebracaoId, setSelectedCelebracaoId] = useState<number | null>(null)
  const [selectedCelebracao, setSelectedCelebracao] = useState<Celebracao | null>(null)
  const [items, setItems] = useState<EscalaItem[]>([])
  const [escalaId, setEscalaId] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]         = useState(false)
  const [sugerindo, setSugerindo]       = useState(false)
  const [infoSugestaoOpen, setInfoSugestaoOpen] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [conflictMap, setConflictMap] = useState<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>({})
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadInitialData = useCallback(async () => {
    try {
      const [celebR, cerR] = await Promise.all([
        api.get<Celebracao[]>('/celebracoes'),
        api.get<Cerimoniario[]>('/cerimoniarios?ativo=1'),
      ])
      setCelebracoes(celebR.data)
      setCerimoniarios(cerR.data.filter((c) => c.ativo))

      // Pre-select from query string
      const qCelebId = searchParams.get('celebracao_id')
      if (qCelebId) {
        const celebracao = celebR.data.find((c) => c.id === Number(qCelebId))
        if (celebracao) {
          setSelectedCelebracaoId(celebracao.id)
          setSelectedCelebracao(celebracao)

          // Use the API to generate structure — ensures qtd_cerimoniarios
          // from the DB is respected (same path as manual dropdown selection)
          try {
            const structR = await api.post<{
              celebracao: Celebracao
              estrutura: Array<{ funcao_id: number | null; funcao: { titulo: string } | null; funcao_label: string | null; ordem: number }>
              especial: boolean
            }>('/escalas/gerar-estrutura', { celebracao_id: celebracao.id })

            const newItems: EscalaItem[] = structR.data.estrutura.map((item) => ({
              id: crypto.randomUUID(),
              funcao_label: item.funcao_id ? (FUNCAO_ID_TO_LABEL[item.funcao_id] ?? item.funcao?.titulo ?? item.funcao_label ?? '') : (item.funcao_label ?? ''),
              ordem: item.ordem,
              cerimoniario_id: undefined,
              cerimoniario: undefined,
            }))
            setItems(newItems)
          } catch {
            // Fallback to local generation
            generateStructure(celebracao)
          }

          // Load conflict map + blocked dates for this celebration's date
          const dateStr = celebracao.data.substring(0, 10)
          try {
            const confR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>(
              `/escalas/conflitos-data?data=${dateStr}`
            )
            setConflictMap(confR.data ?? {})
          } catch { /* ignore */ }
          try {
            const blkR = await api.get<number[]>(`/cerimoniarios/bloqueados-em?data=${dateStr}`)
            setBlockedIds(new Set(Array.isArray(blkR.data) ? blkR.data : []))
          } catch { /* ignore */ }
        }
      }

      // Load existing escala for edit
      if (isEditing) {
        const escalaR = await api.get<{
          id: number
          celebracao_id: number
          celebracao: Celebracao
          escala_itens: EscalaItem[]
          observacao?: string
        }>(`/escalas/${id}`)
        const escala = escalaR.data
        setEscalaId(escala.id)
        setObservacao(escala.observacao || '')
        setSelectedCelebracaoId(escala.celebracao_id)
        setSelectedCelebracao(escala.celebracao)

        const loadedItems: EscalaItem[] = (escala.escala_itens || []).map((item) => ({
          ...item,
          id: item.id?.toString() || crypto.randomUUID(),
          // fallback to embedded cerimoniario for inactive members not in active list
          cerimoniario: cerR.data.find((c) => c.id === item.cerimoniario_id) ?? item.cerimoniario,
        }))
        setItems(loadedItems)

        // Load conflict map + blocked dates for this escala's date
        const editDateStr = escala.celebracao.data.substring(0, 10)
        try {
          const confR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>(
            `/escalas/conflitos-data?data=${editDateStr}&escala_id=${id}`
          )
          setConflictMap(confR.data ?? {})
        } catch { /* ignore */ }
        try {
          const blkR = await api.get<number[]>(`/cerimoniarios/bloqueados-em?data=${editDateStr}`)
          setBlockedIds(new Set(Array.isArray(blkR.data) ? blkR.data : []))
        } catch { /* ignore */ }
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, searchParams])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  function generateStructure(celebracao: Celebracao) {
    const structure = buildStructure(celebracao)
    const newItems: EscalaItem[] = structure.map((s, i) => ({
      id: crypto.randomUUID(),
      funcao_label: s.funcao_label,
      ordem: i,
      cerimoniario_id: undefined,
      cerimoniario: undefined,
    }))
    setItems(newItems)
    return newItems
  }

  async function handleCelebracaoChange(celebracaoId: number) {
    const celebracao = celebracoes.find((c) => c.id === celebracaoId)
    if (!celebracao) return
    setSelectedCelebracaoId(celebracaoId)
    setSelectedCelebracao(celebracao)

    try {
      const r = await api.post<{
        celebracao: Celebracao
        estrutura: Array<{ funcao_id: number | null; funcao: { titulo: string } | null; funcao_label: string | null; ordem: number }>
        especial: boolean
      }>(
        '/escalas/gerar-estrutura',
        { celebracao_id: celebracaoId }
      )
      const newItems: EscalaItem[] = r.data.estrutura.map((item) => ({
        id: crypto.randomUUID(),
        funcao_label: item.funcao_id ? (FUNCAO_ID_TO_LABEL[item.funcao_id] ?? item.funcao?.titulo ?? item.funcao_label ?? '') : (item.funcao_label ?? ''),
        ordem: item.ordem,
        cerimoniario_id: undefined,
        cerimoniario: undefined,
      }))
      setItems(newItems)
    } catch {
      generateStructure(celebracao)
    }

    // Fetch conflicts + blocked dates for this date
    const dateStr = celebracao.data.substring(0, 10)
    try {
      const conflitosR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string; escala_id: number }>>>(
        `/escalas/conflitos-data?data=${dateStr}&escala_id=${escalaId ?? ''}`
      )
      setConflictMap(conflitosR.data ?? {})
    } catch {
      setConflictMap({})
    }
    try {
      const blkR = await api.get<number[]>(`/cerimoniarios/bloqueados-em?data=${dateStr}`)
      setBlockedIds(new Set(Array.isArray(blkR.data) ? blkR.data : []))
    } catch {
      setBlockedIds(new Set())
    }
  }

  function handleItemChange(itemId: string, field: 'funcao_label' | 'cerimoniario_id', value: string | number | undefined) {
    setItems((prev) =>
      prev.map((item): EscalaItem => {
        if (item.id !== itemId) return item
        if (field === 'cerimoniario_id') {
          const cer = cerimoniarios.find((c) => c.id === value)
          return { ...item, cerimoniario_id: value as number | undefined, cerimoniario: cer }
        }
        return { ...item, funcao_label: value as string | undefined }
      })
    )
  }

  function handleRemoveItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function handleSugerir() {
    if (!selectedCelebracaoId) return
    setSugerindo(true)
    try {
      const r = await api.get<Array<{ slot: number; funcao_label: string; cerimoniario: Cerimoniario | null }>>(
        `/escalas/sugerir?celebracao_id=${selectedCelebracaoId}`
      )
      const suggestions = r.data
      setItems(prev => prev.map((item, idx) => {
        const sug = suggestions.find(s => s.slot === idx)
        if (sug?.cerimoniario) {
          return {
            ...item,
            cerimoniario_id: sug.cerimoniario.id,
            cerimoniario: sug.cerimoniario,
          }
        }
        return item
      }))
      toast.success('Sugestão aplicada! Ajuste conforme necessário.')
    } catch {
      toast.error('Erro ao gerar sugestão')
    } finally {
      setSugerindo(false)
    }
  }

  function handleGridAssign(itemId: string, cerimoniarioId: number | undefined) {
    setItems((prev) => {
      let updated = prev
      // Auto-dedup: remove this cerimoniário from any other slot
      if (cerimoniarioId !== undefined) {
        updated = prev.map((item) =>
          item.cerimoniario_id === cerimoniarioId && item.id !== itemId
            ? { ...item, cerimoniario_id: undefined, cerimoniario: undefined }
            : item
        )
      }
      return updated.map((item) =>
        item.id === itemId
          ? {
              ...item,
              cerimoniario_id: cerimoniarioId,
              cerimoniario: cerimoniarioId ? cerimoniarios.find((c) => c.id === cerimoniarioId) : undefined,
            }
          : item
      )
    })
  }

  function handleAddRow() {
    const newItem: EscalaItem = {
      id: crypto.randomUUID(),
      funcao_label: '',
      ordem: items.length,
      cerimoniario_id: undefined,
      cerimoniario: undefined,
    }
    setItems((prev) => [...prev, newItem])
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      // Swap only the assigned member; functions stay in their original slots
      return prev.map((item, idx) => {
        if (idx === oldIndex) return { ...item, cerimoniario_id: prev[newIndex].cerimoniario_id, cerimoniario: prev[newIndex].cerimoniario }
        if (idx === newIndex) return { ...item, cerimoniario_id: prev[oldIndex].cerimoniario_id, cerimoniario: prev[oldIndex].cerimoniario }
        return item
      })
    })
  }

  async function handleSave() {
    setSaveAttempted(true)
    if (!selectedCelebracaoId) {
      toast.error('Selecione uma celebração antes de salvar')
      return
    }
    setSaving(true)
    try {
      const payload = {
        celebracao_id: selectedCelebracaoId,
        observacao,
        itens: items.map((item, idx) => ({
          id: /^\d+$/.test(item.id) ? Number(item.id) : undefined,
          cerimoniario_id: item.cerimoniario_id || null,
          funcao_label: item.funcao_label,
          ordem: idx,
        })),
      }

      if (isEditing && escalaId) {
        await api.put(`/escalas/${escalaId}`, payload)
        toast.success('Escala atualizada!')
        navigate(`/escalas/${escalaId}`)
      } else {
        const r = await api.post<{ id: number }>('/escalas', payload)
        toast.success('Escala salva!')
        navigate(`/escalas/${r.data.id}`)
      }
    } catch {
      toast.error('Erro ao salvar escala')
    } finally {
      setSaving(false)
    }
  }

  function handleCopyWhatsApp() {
    if (!selectedCelebracao) return
    const enrichedItems = items.map((item) => ({
      ...item,
      cerimoniario: item.cerimoniario_id
        ? cerimoniarios.find((c) => c.id === item.cerimoniario_id)
        : undefined,
    }))
    const text = buildWhatsAppText(selectedCelebracao, enrichedItems)
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Copiado para área de transferência!'))
      .catch(() => toast.error('Erro ao copiar'))
  }

  function handleSendWhatsApp() {
    if (!selectedCelebracao) return
    const enrichedItems = items.map((item) => ({
      ...item,
      cerimoniario: item.cerimoniario_id
        ? cerimoniarios.find((c) => c.id === item.cerimoniario_id)
        : undefined,
    }))
    const text = buildWhatsAppText(selectedCelebracao, enrichedItems)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function handlePdf() {
    if (escalaId) {
      try {
        const r = await api.get(`/escalas/${escalaId}/pdf`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([r.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `escala-${escalaId}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } catch {
        toast.error('Erro ao gerar PDF')
      }
    } else {
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Compute duplicates
  const allCerIds = items.map((i) => i.cerimoniario_id).filter(Boolean)
  const dupeIds = new Set(allCerIds.filter((cid, idx) => allCerIds.indexOf(cid) !== idx))

  const currentStep: 1 | 2 | 3 = selectedCelebracao ? (items.length > 0 ? 3 : 2) : 1

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/escalas')}
          className="p-2 mt-1 text-gray-500 hover:text-wine-900 hover:bg-wine-50 rounded-xl transition-all duration-200 flex-shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Escala' : 'Nova Escala'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? 'Modifique os cerimoniários e funções' : 'Monte a escala da celebração'}
          </p>
        </div>
        <StepIndicator current={currentStep} />
      </div>

      {/* Step 1: Select Celebration */}
      <div className={`card p-5 ${saveAttempted && !selectedCelebracaoId ? 'border-2 border-red-400' : ''}`}>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-wine-900 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
          Selecionar Celebração
        </h2>
        <SelectField
          value={selectedCelebracaoId ?? ''}
          onChange={(e) => {
            const val = Number(e.target.value)
            if (val) handleCelebracaoChange(val)
          }}
          disabled={isEditing}
          wrapperClassName="max-w-lg"
        >
          <option value="">— Selecione uma celebração —</option>
          {celebracoes
            // Show: celebrations without scale OR the one currently being edited
            .filter((c) => !c.escala || c.id === selectedCelebracaoId)
            .map((c) => {
              let dateLabel = c.data.substring(5, 10).split('-').reverse().join('/')  // dd/MM fallback
              try { dateLabel = format(safeParseDate(c.data), "EEE dd/MM", { locale: ptBR }) } catch { /* keep raw */ }
              const hora = c.horario.substring(0, 5)
              const tipo = getTipoCelebracao(c)
              const label = `${dateLabel} · ${hora} · ${tipo} · ${c.periodo_liturgico}`
              return <option key={c.id} value={c.id}>{label}</option>
            })
          }
        </SelectField>
        {!isEditing && celebracoes.filter((c) => !c.escala).length === 0 && (
          <p className="text-amber-600 text-sm mt-2 flex items-center gap-1.5">
            <AlertCircle size={14} />
            Todas as celebrações já possuem escala. Cadastre uma nova celebração primeiro.
          </p>
        )}
        {saveAttempted && !selectedCelebracaoId && (
          <p className="text-red-600 text-sm mt-2 flex items-center gap-1.5">
            <AlertCircle size={14} />
            Selecione uma celebração antes de salvar.
          </p>
        )}
      </div>

      {/* Step 2: Celebration Info card */}
      {selectedCelebracao && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-wine-900 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Celebração Selecionada
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700 text-sm">
              <Calendar size={15} className="text-wine-600" />
              <span className="font-semibold">{formatData(selectedCelebracao.data)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 text-sm">
              <Clock size={15} className="text-wine-600" />
              <span>{formatHorario(selectedCelebracao.horario)}</span>
            </div>
            <Badge variant="wine" size="sm">{selectedCelebracao.periodo_liturgico}</Badge>
            <CelebracaoFlags c={selectedCelebracao} />
          </div>
          {selectedCelebracao.observacao && (
            <p className="mt-2 text-sm text-gray-400 italic">{selectedCelebracao.observacao}</p>
          )}
        </div>
      )}

      {/* Step 3: Scale Items */}
      {selectedCelebracao && (
        <div className="card p-5">
          {/* Título + botões: empilhados no mobile, lado a lado no sm+ */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-wine-900 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
              Funções da Escala
              <span className="normal-case text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'função' : 'funções'}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Visualização em lista"
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-wine-900 text-white' : 'bg-white text-gray-400 hover:text-gray-700'}`}
                >
                  <LayoutList size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Visualização em grade"
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-wine-900 text-white' : 'bg-white text-gray-400 hover:text-gray-700'}`}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSugerir}
                  disabled={sugerindo}
                  className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-semibold text-sm py-1.5 px-3 rounded-lg hover:bg-amber-50 border border-amber-200 transition-all duration-200 disabled:opacity-60"
                  title="Sugerir acólitos automaticamente por disponibilidade e rotatividade"
                >
                  {sugerindo ? <span className="animate-spin text-xs">↻</span> : <Sparkles size={14} />}
                  {sugerindo ? 'Sugerindo...' : 'Sugerir'}
                </button>
                <button
                  type="button"
                  onClick={() => setInfoSugestaoOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-amber-700 transition-colors rounded-lg hover:bg-amber-50"
                  title="Como funciona a sugestão automática"
                >
                  <Info size={14} />
                </button>
              </div>
              {viewMode === 'list' && (
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 text-wine-700 hover:text-wine-900 font-semibold text-sm py-1.5 px-3 rounded-lg hover:bg-wine-50 border border-wine-200 transition-all duration-200"
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              )}
            </div>
          </div>

          {/* Legenda: 2 colunas no mobile, linha no sm+ */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1.5 sm:gap-4 mb-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
              Disponível
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
              Fora do horário
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              Indisponível
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
              Já escalado
            </div>
          </div>

          {/* Duplicate cerimoniário warning */}
          {dupeIds.size > 0 && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Cerimoniário atribuído mais de uma vez. Verifique as linhas destacadas.</span>
            </div>
          )}

          {viewMode === 'list' ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        index={idx}
                        cerimoniarios={cerimoniarios.filter(c => !blockedIds.has(c.id) || item.cerimoniario_id === c.id)}
                        celebracao={selectedCelebracao}
                        onChange={handleItemChange}
                        onRemove={handleRemoveItem}
                        hasDuplicateCerimoniario={!!item.cerimoniario_id && dupeIds.has(item.cerimoniario_id)}
                        conflicts={conflictMap[item.cerimoniario_id ?? 0] ?? []}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mt-2">
                  <p className="text-sm font-medium">Nenhuma função adicionada</p>
                  <button
                    onClick={handleAddRow}
                    className="mt-2 text-wine-700 text-sm font-semibold hover:text-wine-900 transition-colors"
                  >
                    + Adicionar função
                  </button>
                </div>
              )}
            </>
          ) : (
            items.length > 0 ? (
              <GridView
                items={items}
                cerimoniarios={cerimoniarios.filter(c => {
                  if (!blockedIds.has(c.id)) return true
                  // Manter na grade se já está atribuído em algum slot
                  return items.some(i => i.cerimoniario_id === c.id)
                })}
                celebracao={selectedCelebracao}
                onAssign={handleGridAssign}
                conflictMap={conflictMap}
              />
            ) : (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm font-medium">Nenhuma função — volte para lista para adicionar</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Observação */}
      {selectedCelebracao && (
        <div className="card p-5">
          <label className="label">Observação da Escala</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Observações adicionais..."
            className="input-field resize-none"
          />
        </div>
      )}

      {/* Action Buttons */}
      {selectedCelebracao && (
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full sm:w-auto justify-center"
            >
              {saving ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? 'Salvando...' : 'Salvar Escala'}
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="btn-gold w-full sm:w-auto justify-center"
            >
              <MessageCircle size={18} />
              Copiar para WhatsApp
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all duration-200 text-base w-full sm:w-auto"
            >
              <Send size={18} />
              Enviar no WhatsApp
            </button>

            <button
              onClick={handlePdf}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-800 active:scale-95 transition-all duration-200 text-base w-full sm:w-auto"
            >
              <FileDown size={18} />
              Baixar PDF
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Modal: como funciona a sugestão */}

    {infoSugestaoOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-amber-700" />
              </div>
              <h2 className="font-bold text-gray-900">Como funciona a sugestão</h2>
            </div>
            <button
              type="button"
              onClick={() => setInfoSugestaoOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>
              A sugestão é baseada em <strong>rotatividade</strong> — acólitos que serviram há mais tempo recebem prioridade — e em <strong>disponibilidade</strong> declarada no horário da celebração.
            </p>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
              <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-700 text-white text-[10px] flex items-center justify-center font-bold">!</span>
                Funções prioritárias
              </p>
              <p className="text-amber-800 text-xs">
                <strong>Mestre, 2º Auxiliar e Turiferário</strong> são reservados exclusivamente para cerimoniários marcados como <strong>Experiente</strong> ou <strong>Mestre</strong>. Para a função Mestre, acólitos com a flag <em>Mestre</em> têm preferência dentro desse grupo.
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
              <p className="font-semibold text-gray-800">Demais funções</p>
              <p className="text-gray-600 text-xs">
                São preenchidas priorizando cerimoniários <strong>sem</strong> a flag experiente ou mestre, reservando os mais experientes para as funções acima. Se não houver disponíveis nesse perfil, a sugestão considera qualquer cerimoniário disponível.
              </p>
            </div>

            <p className="text-xs text-gray-400">
              Nenhum cerimoniário é sugerido duas vezes na mesma escala.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setInfoSugestaoOpen(false)}
            className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    )}
    </>
  )
}

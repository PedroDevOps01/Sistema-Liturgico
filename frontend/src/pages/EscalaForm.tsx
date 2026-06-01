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
} from 'lucide-react'
import api from '../lib/api'
import type { Celebracao, Cerimoniario, EscalaItem } from '../types'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import SearchableSelect from '../components/common/SearchableSelect'
import type { SelectOption } from '../components/common/SearchableSelect'

const FUNCOES_LABELS = [
  'Cerimoniário - Mestre',
  'Cerimoniário - Auxiliar 1',
  'Cerimoniário - Auxiliar 2',
  'Cerimoniário - Auxiliar 3',
  'Cerimoniário - Auxiliar 4',
  'Turiferário',
  'Môr',
  'Mitra',
  'Bácula',
]

function buildStructure(c: Celebracao): Omit<EscalaItem, 'id'>[] {
  const base: Omit<EscalaItem, 'id'>[] = []

  base.push({ funcao_label: 'Cerimoniário - Mestre', ordem: 0 })

  const isSpecial = c.celebracao_6h || c.celebracao_palavra || c.celebracao_solene
    || c.casamento || c.batismo || c.crisma
    || c.primeira_eucaristia || c.adoracao_santissimo || c.procissao
    || c.via_sacra || c.exequias || c.vigilia_pascal || c.paixao_senhor || c.ordenacao

  if (!isSpecial) {
    for (let i = 1; i <= 4; i++) {
      base.push({ funcao_label: `Cerimoniário - Auxiliar ${i}`, ordem: base.length })
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
    result.push({ funcao_label: '', ordem: result.length })
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

  // Build options for SearchableSelect
  const cerOptions: SelectOption[] = cerimoniarios.map((c) => {
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
        className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
          isDragging
            ? 'bg-white border-wine-400 shadow-xl opacity-80 z-10'
            : hasDuplicateCerimoniario
            ? 'bg-red-50 border-red-300'
            : conflicts.length > 0
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
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

        {/* Function Label — styled select */}
        <div className="flex-shrink-0 w-44 sm:w-52 min-w-0">
          <select
            value={item.funcao_label || ''}
            onChange={(e) => onChange(item.id, 'funcao_label', e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-wine-900 focus:ring-2 focus:ring-wine-900/10 bg-white transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: '32px',
            }}
          >
            <option value="">— Função —</option>
            <optgroup label="Funções padrão">
              {FUNCOES_LABELS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Cerimoniário SearchableSelect */}
        <div className="flex-1 min-w-0">
          <SearchableSelect
            options={cerOptions}
            value={item.cerimoniario_id ?? null}
            onChange={(val) => onChange(item.id, 'cerimoniario_id', val)}
            placeholder="— Selecionar Cerimoniário —"
          />
        </div>

        {/* Availability indicator */}
        {selectedCerimoniario && (
          <div className="flex-shrink-0">
            {(() => {
              const avail = getAvailabilityInfo(selectedCerimoniario, celebracao)
              const hasConflict = conflicts.length > 0
              return (
                <span
                  className={`w-3 h-3 rounded-full block flex-shrink-0 ${
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
        )}

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
          title="Remover"
        >
          <Trash2 size={15} />
        </button>
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
  if (l.includes('mestre') || (l.startsWith('cerimoni') && !l.includes('aux'))) return 'Cerimoniário'
  if (l.includes('auxiliar 1') || l.includes('primeiro') || l.includes('microfone')) return '1ª Aux'
  if (l.includes('auxiliar 2') || l.includes('segundo')  || l.includes('missal'))    return '2ª Aux'
  if (l.includes('auxiliar 3') || l.includes('terceiro') || l.includes('leitor'))    return '3ª Aux'
  if (l.includes('auxiliar 4') || l.includes('quarto')   || l.includes('prece'))     return '4ª Aux'
  if (l.includes('auxiliar 5') || l.includes('quinto')   || l.includes('turifer'))   return '5ª Aux'
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
  const [saving, setSaving] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [conflictMap, setConflictMap] = useState<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>({})

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
              estrutura: Array<{ funcao_id: number; funcao: { titulo: string } | null; funcao_label: string | null; ordem: number }>
              especial: boolean
            }>('/escalas/gerar-estrutura', { celebracao_id: celebracao.id })

            const newItems: EscalaItem[] = structR.data.estrutura.map((item) => ({
              id: crypto.randomUUID(),
              funcao_label: item.funcao?.titulo ?? item.funcao_label ?? '',
              ordem: item.ordem,
              cerimoniario_id: undefined,
              cerimoniario: undefined,
            }))
            setItems(newItems)
          } catch {
            // Fallback to local generation
            generateStructure(celebracao)
          }

          // Load conflict map for this celebration's date
          try {
            const confR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>(
              `/escalas/conflitos-data?data=${celebracao.data.substring(0, 10)}`
            )
            setConflictMap(confR.data ?? {})
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

        // Load conflict map for this escala's date
        try {
          const confR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string }>>>(
            `/escalas/conflitos-data?data=${escala.celebracao.data.substring(0, 10)}&escala_id=${id}`
          )
          setConflictMap(confR.data ?? {})
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
      const r = await api.post<{ celebracao: Celebracao; estrutura: Array<{ funcao_label: string; ordem: number }>; especial: boolean }>(
        '/escalas/gerar-estrutura',
        { celebracao_id: celebracaoId }
      )
      const newItems: EscalaItem[] = r.data.estrutura.map((item) => ({
        id: crypto.randomUUID(),
        funcao_label: item.funcao_label,
        ordem: item.ordem,
        cerimoniario_id: undefined,
        cerimoniario: undefined,
      }))
      setItems(newItems)
    } catch {
      generateStructure(celebracao)
    }

    // Fetch conflicts for this date
    try {
      const dateStr = celebracao.data.substring(0, 10)
      const conflitosR = await api.get<Record<number, Array<{ horario: string; periodo_liturgico: string; escala_id: number }>>>(
        `/escalas/conflitos-data?data=${dateStr}&escala_id=${escalaId ?? ''}`
      )
      setConflictMap(conflitosR.data ?? {})
    } catch {
      setConflictMap({})
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
      return arrayMove(prev, oldIndex, newIndex).map((item, idx) => ({ ...item, ordem: idx }))
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
        <select
          value={selectedCelebracaoId ?? ''}
          onChange={(e) => {
            const val = Number(e.target.value)
            if (val) handleCelebracaoChange(val)
          }}
          disabled={isEditing}
          className="input-field max-w-lg"
        >
          <option value="">— Selecione uma celebração —</option>
          {celebracoes
            // Show: celebrations without scale OR the one currently being edited
            .filter((c) => !c.escala || c.id === selectedCelebracaoId)
            .map((c) => {
              let label = c.data.substring(0, 10)
              try { label = format(safeParseDate(c.data), "dd/MM/yyyy (EEE)", { locale: ptBR }) } catch { /* keep raw */ }
              return (
                <option key={c.id} value={c.id}>
                  {label} - {c.horario.substring(0, 5)} - {c.periodo_liturgico}
                </option>
              )
            })
          }
        </select>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-wine-900 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              Funções da Escala
              <span className="normal-case text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'função' : 'funções'}
              </span>
            </h2>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 text-wine-700 hover:text-wine-900 font-semibold text-sm py-1.5 px-3 rounded-lg hover:bg-wine-50 transition-all duration-200"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
              Disponível neste horário
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
              Fora do horário habitual
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
              Indisponível temporário
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block" />
              Já escalado neste dia
            </div>
          </div>

          {/* Duplicate cerimoniário warning */}
          {dupeIds.size > 0 && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Cerimoniário atribuído mais de uma vez. Verifique as linhas destacadas.</span>
            </div>
          )}

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
                    cerimoniarios={cerimoniarios}
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
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
              className="btn-gold"
            >
              <MessageCircle size={18} />
              Copiar para WhatsApp
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all duration-200 text-base"
            >
              <Send size={18} />
              Enviar no WhatsApp
            </button>

            <button
              onClick={handlePdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-800 active:scale-95 transition-all duration-200 text-base"
            >
              <FileDown size={18} />
              Baixar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

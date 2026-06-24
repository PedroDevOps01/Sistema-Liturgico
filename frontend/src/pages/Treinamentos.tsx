import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  MessageCircle, Send, CheckCircle2, XCircle, AlertCircle,
  MinusCircle, GraduationCap, Users, TrendingUp,
  Search, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Cerimoniario } from '../types'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { getPeriodoLiturgico, getPeriodoBadgeVariant } from '../lib/liturgico'
import { parseDate, parseDateParts, formatHorario } from '../lib/dateUtils'
import CalcNote from '../components/common/CalcNote'

// ── Types ────────────────────────────────────────────────────────────────────

interface FormacaoNivelComCompetencias {
  id: number
  nome: string
  competencias?: { id: number; nome: string }[]
}

interface TreinamentoPresenca {
  id: number
  treinamento_id: number
  cerimoniario_id: number
  cerimoniario?: Cerimoniario
  status: 'presente' | 'ausente' | 'justificado' | null
  observacao?: string
}

interface Treinamento {
  id: number
  data: string
  horario: string
  tema: string
  local?: string
  funcoes?: string[]
  periodo_liturgico?: string
  observacao?: string
  presencas: TreinamentoPresenca[]
  competencias?: { id: number; nome: string }[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FUNCOES_OPTIONS = [
  'Cerimoniário - Mestre',
  'Cerimoniário - Auxiliar 1',
  'Cerimoniário - Auxiliar 2',
  'Cerimoniário - Auxiliar 3',
  'Cerimoniário - Auxiliar 4',
  'Turiferário',
  'Môr',
  'Mitra',
  'Bácula',
  'Todos',
]

const STATUS_CONFIG = {
  presente:    { label: 'Presente',    icon: <CheckCircle2 size={13} />, active: 'bg-green-600 text-white border-green-600', hover: 'hover:bg-green-50 hover:text-green-700 hover:border-green-300' },
  ausente:     { label: 'Ausente',     icon: <XCircle      size={13} />, active: 'bg-red-600   text-white border-red-600',   hover: 'hover:bg-red-50   hover:text-red-700   hover:border-red-300'   },
  justificado: { label: 'Justificado', icon: <AlertCircle  size={13} />, active: 'bg-amber-500 text-white border-amber-500', hover: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function FuncoesChips({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FUNCOES_OPTIONS.map((f) => {
        const active = selected.includes(f)
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(active ? selected.filter((x) => x !== f) : [...selected, f])}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors select-none ${
              active ? 'bg-wine-900 text-white border-wine-900' : 'bg-white text-gray-600 border-gray-300 hover:border-wine-700 hover:text-wine-900'
            }`}
          >
            {f}
          </button>
        )
      })}
    </div>
  )
}

// ── Training card ─────────────────────────────────────────────────────────────

function TreinamentoCard({
  t,
  cerimoniarios: _cerimoniarios,
  onEdit,
  onDelete,
  onReload,
}: {
  t: Treinamento
  cerimoniarios: Cerimoniario[]
  onEdit: () => void
  onDelete: () => void
  onReload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null)

  const presentes   = t.presencas.filter((p) => p.status === 'presente').length
  const ausentes    = t.presencas.filter((p) => p.status === 'ausente').length
  const justificado = t.presencas.filter((p) => p.status === 'justificado').length
  const semStatus   = t.presencas.filter((p) => !p.status).length

  async function handleStatus(p: TreinamentoPresenca, status: 'presente' | 'ausente' | 'justificado') {
    const novo = p.status === status ? null : status
    setLoadingStatus(p.cerimoniario_id)
    try {
      await api.put(`/treinamentos/${t.id}/presencas/${p.cerimoniario_id}`, { status: novo })
      onReload()
    } catch {
      toast.error('Erro ao registrar presença')
    } finally {
      setLoadingStatus(null)
    }
  }

  async function handleConvite() {
    try {
      const r = await api.get<{ texto: string }>(`/treinamentos/${t.id}/convite`)
      await navigator.clipboard.writeText(r.data.texto)
      toast.success('Convite copiado para área de transferência!')
    } catch {
      toast.error('Erro ao gerar convite')
    }
  }

  async function handleConviteWhatsApp() {
    try {
      const r = await api.get<{ texto: string }>(`/treinamentos/${t.id}/convite`)
      window.open(`https://wa.me/?text=${encodeURIComponent(r.data.texto)}`, '_blank')
    } catch {
      toast.error('Erro ao gerar convite')
    }
  }

  const periodoVariant = t.periodo_liturgico ? getPeriodoBadgeVariant(t.periodo_liturgico) : 'wine'

  return (
    <div className="border border-wine-100 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 bg-white hover:bg-wine-50/30 transition-colors text-left"
      >
        <DateBox data={t.data} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">
              {format(parseDate(t.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="text-xs text-gray-500">{formatHorario(t.horario)}</span>
            {t.periodo_liturgico && (
              <Badge variant={periodoVariant} size="sm">{t.periodo_liturgico}</Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-wine-900 mt-0.5 truncate">{t.tema}</p>
          {t.local && <p className="text-xs text-gray-400 mt-0.5">📍 {t.local}</p>}
          {t.funcoes && t.funcoes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {t.funcoes.map((f) => (
                <span key={f} className="text-[10px] px-2 py-0.5 bg-wine-100/60 text-wine-800 rounded-full font-medium">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Presence pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {presentes > 0   && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={11}/>{presentes}</span>}
          {ausentes > 0    && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600"><XCircle size={11}/>{ausentes}</span>}
          {justificado > 0 && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"><AlertCircle size={11}/>{justificado}</span>}
          {semStatus > 0   && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400"><MinusCircle size={11}/>{semStatus}</span>}
          {open ? <ChevronUp size={15} className="text-gray-400 ml-1" /> : <ChevronDown size={15} className="text-gray-400 ml-1" />}
        </div>
      </button>

      {/* Actions row */}
      <div className="flex items-center gap-2 px-5 py-2 bg-gray-50/50 border-t border-gray-100">
        <button onClick={handleConvite} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-wine-200 text-wine-700 hover:bg-wine-50 transition-colors">
          <MessageCircle size={13} /> Copiar convite
        </button>
        <button onClick={handleConviteWhatsApp} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
          <Send size={13} /> WhatsApp
        </button>
        <div className="ml-auto flex gap-1">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"><Pencil size={15} /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Expanded: attendance list */}
      {open && (
        <div className="border-t border-gray-100 bg-white divide-y divide-gray-50">
          {t.presencas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum cerimoniário convidado</p>
          ) : (
            t.presencas.map((p) => (
              <div key={p.cerimoniario_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-400 text-[9px] font-bold">
                    {p.cerimoniario?.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                  {p.cerimoniario?.nome ?? `Cerimoniário #${p.cerimoniario_id}`}
                </span>
                <div className="flex gap-1">
                  {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      disabled={loadingStatus === p.cerimoniario_id}
                      onClick={() => handleStatus(p, key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
                        p.status === key ? cfg.active : `border-gray-200 text-gray-400 ${cfg.hover}`
                      }`}
                    >
                      {cfg.icon}
                      <span className="hidden sm:inline">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Frequency tab ─────────────────────────────────────────────────────────────

function FrequenciaTab({ treinamentos }: { treinamentos: Treinamento[] }) {
  type Row = { id: number; nome: string; total: number; presente: number; ausente: number; justificado: number; pct: number | null }

  const map = new Map<number, Row>()
  treinamentos.forEach((t) => {
    t.presencas.forEach((p) => {
      if (!p.cerimoniario) return
      const existing = map.get(p.cerimoniario_id) ?? { id: p.cerimoniario_id, nome: p.cerimoniario.nome, total: 0, presente: 0, ausente: 0, justificado: 0, pct: null }
      existing.total++
      if (p.status === 'presente')    existing.presente++
      if (p.status === 'ausente')     existing.ausente++
      if (p.status === 'justificado') existing.justificado++
      map.set(p.cerimoniario_id, existing)
    })
  })

  const rows = [...map.values()]
    .map((r) => ({ ...r, pct: r.total > 0 ? Math.round(r.presente / r.total * 100) : null }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

  if (rows.length === 0) {
    return (
      <div className="card p-12 text-center">
        <TrendingUp size={40} className="mx-auto mb-3 text-gray-200" />
        <p className="text-gray-400 font-medium">Nenhum dado de frequência ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
    <CalcNote items={[
      {
        label: 'Frequência por cerimoniário',
        formula: 'Presenças "presente" ÷ Total de convites recebidos × 100',
        note: 'Cada treinamento em que o cerimoniário foi convidado conta como 1 convite. Convites sem status registrado estão no denominador e reduzem a frequência.',
      },
    ]} />
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, var(--theme-mid), var(--theme-to))' }} className="text-white">
            <th className="text-left px-5 py-3 font-semibold text-sm">Cerimoniário</th>
            <th className="text-center px-4 py-3 font-semibold text-sm">Convites</th>
            <th className="text-center px-4 py-3 font-semibold text-sm hidden sm:table-cell">Presente</th>
            <th className="text-center px-4 py-3 font-semibold text-sm hidden sm:table-cell">Ausente</th>
            <th className="text-center px-4 py-3 font-semibold text-sm hidden sm:table-cell">Justificado</th>
            <th className="text-center px-4 py-3 font-semibold text-sm">Frequência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 text-[9px] font-bold">
                      {r.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{r.nome}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{r.total}</td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                <span className="text-sm font-semibold text-green-700">{r.presente}</span>
              </td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                <span className="text-sm font-semibold text-red-600">{r.ausente}</span>
              </td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                <span className="text-sm font-semibold text-amber-600">{r.justificado}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 justify-center">
                  {r.pct !== null ? (
                    <>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 hidden sm:block">
                        <div className={`h-full rounded-full ${r.pct >= 80 ? 'bg-green-500' : r.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${r.pct >= 80 ? 'text-green-700' : r.pct >= 60 ? 'text-amber-700' : 'text-red-600'}`}>{r.pct}%</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface FormState {
  data: string
  horario: string
  tema: string
  local: string
  funcoes: string[]
  periodo_liturgico: string
  observacao: string
  cerimoniarios: number[]
  competencia_ids: number[]
}

function defaultForm(): FormState {
  const { periodo } = getPeriodoLiturgico()
  return { data: '', horario: '', tema: '', local: '', funcoes: [], periodo_liturgico: periodo, observacao: '', cerimoniarios: [], competencia_ids: [] }
}

export default function Treinamentos() {
  const [list, setList] = useState<Treinamento[]>([])
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [niveis, setNiveis] = useState<FormacaoNivelComCompetencias[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'treinos' | 'frequencia'>('treinos')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Treinamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Treinamento | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [cerSearch, setCerSearch] = useState('')

  const loadList = useCallback(async () => {
    try {
      const [tR, cR, nR] = await Promise.all([
        api.get<Treinamento[]>('/treinamentos'),
        api.get<Cerimoniario[]>('/cerimoniarios'),
        api.get<FormacaoNivelComCompetencias[]>('/formacao/niveis'),
      ])
      setList(tR.data)
      setCerimoniarios(cR.data)
      setNiveis(nR.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  function openCreate() {
    setEditing(null)
    setForm(defaultForm())
    setModalOpen(true)
  }

  function openEdit(t: Treinamento) {
    setEditing(t)
    setForm({
      data:              t.data.substring(0, 10),
      horario:           t.horario.substring(0, 5),
      tema:              t.tema,
      local:             t.local ?? '',
      funcoes:           t.funcoes ?? [],
      periodo_liturgico: t.periodo_liturgico ?? '',
      observacao:        t.observacao ?? '',
      cerimoniarios:     t.presencas.map((p) => p.cerimoniario_id),
      competencia_ids:   (t.competencias ?? []).map((c) => c.id),
    })
    setModalOpen(true)
  }

  function handleDataChange(value: string) {
    if (value) {
      const { periodo } = getPeriodoLiturgico(value)
      setForm((f) => ({ ...f, data: value, periodo_liturgico: periodo }))
    } else {
      setForm((f) => ({ ...f, data: value }))
    }
  }

  async function handleSave() {
    if (!form.data || !form.horario || !form.tema.trim()) {
      toast.error('Preencha data, horário e tema.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/treinamentos/${editing.id}`, form)
        toast.success('Treinamento atualizado!')
      } else {
        await api.post('/treinamentos', form)
        toast.success('Treinamento criado!')
      }
      setModalOpen(false)
      loadList()
    } catch {
      toast.error('Erro ao salvar treinamento')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/treinamentos/${deleteTarget.id}`)
      toast.success('Treinamento removido!')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const filtered = list.filter((t) => {
    const s = search.toLowerCase()
    return (
      t.tema.toLowerCase().includes(s) ||
      t.data.includes(s) ||
      (t.local ?? '').toLowerCase().includes(s) ||
      (t.periodo_liturgico ?? '').toLowerCase().includes(s)
    )
  })

  const totalTreinos   = list.length
  const totalConvites  = list.reduce((s, t) => s + t.presencas.length, 0)
  const totalPresentes = list.reduce((s, t) => s + t.presencas.filter((p) => p.status === 'presente').length, 0)
  const mediaPresenca  = totalConvites > 0 ? Math.round(totalPresentes / totalConvites * 100) : null

  const filteredCers = cerimoniarios.filter((c) => c.nome.toLowerCase().includes(cerSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinamentos"
        subtitle={`${totalTreinos} treinamento${totalTreinos !== 1 ? 's' : ''} cadastrado${totalTreinos !== 1 ? 's' : ''}`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={18} /> Novo Treinamento
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={20} className="text-wine-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalTreinos}</p>
              <p className="text-xs text-gray-500">Total de treinos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-wine-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalConvites}</p>
              <p className="text-xs text-gray-500">Convites enviados</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-wine-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mediaPresenca !== null ? `${mediaPresenca}%` : '—'}</p>
              <p className="text-xs text-gray-500">Presença média</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['treinos', 'frequencia'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow text-wine-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'treinos' ? 'Treinos' : 'Frequência'}
          </button>
        ))}
      </div>

      {tab === 'treinos' && (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar treinos..." className="input-field pl-10 pr-10" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={15} /></button>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <GraduationCap size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-500">Nenhum treinamento encontrado</p>
              {!search && <button onClick={openCreate} className="btn-primary mt-4 text-sm px-4 py-2"><Plus size={14} /> Criar primeiro treino</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <TreinamentoCard
                  key={t.id}
                  t={t}
                  cerimoniarios={cerimoniarios}
                  onEdit={() => openEdit(t)}
                  onDelete={() => setDeleteTarget(t)}
                  onReload={loadList}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'frequencia' && <FrequenciaTab treinamentos={list} />}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Treinamento' : 'Novo Treinamento'}
        size="2xl"
        footer={<>
          <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Treinamento'}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => handleDataChange(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Horário *</label>
              <input type="time" value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Tema / Assunto *</label>
            <input value={form.tema} onChange={(e) => setForm((f) => ({ ...f, tema: e.target.value }))} className="input-field" placeholder="Ex: Procedimentos durante a Missa Solene" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Local</label>
              <input value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} className="input-field" placeholder="Ex: Sacristia" />
            </div>
            <div>
              <label className="label">Período Litúrgico</label>
              <input value={form.periodo_liturgico} onChange={(e) => setForm((f) => ({ ...f, periodo_liturgico: e.target.value }))} className="input-field" placeholder="Auto-detectado" />
            </div>
          </div>

          <div>
            <label className="label">Funções treinadas</label>
            <FuncoesChips selected={form.funcoes} onChange={(v) => setForm((f) => ({ ...f, funcoes: v }))} />
          </div>

          <div>
            <label className="label">Observação / Informações adicionais</label>
            <textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Detalhes que serão incluídos no convite..." />
          </div>

          {/* Vincular competências de formação */}
          <div>
            <label className="label">
              Competências de formação vinculadas{' '}
              {form.competencia_ids.length > 0 && (
                <span className="ml-1 text-xs font-semibold text-wine-700 bg-wine-100 px-2 py-0.5 rounded-full">
                  {form.competencia_ids.length} selecionada{form.competencia_ids.length !== 1 ? 's' : ''}
                </span>
              )}
            </label>
            {niveis.filter((n) => (n.competencias ?? []).length > 0).length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma competência cadastrada.</p>
            ) : (
              <div className="border-2 border-wine-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {niveis.filter((n) => (n.competencias ?? []).length > 0).map((nivel) => (
                  <div key={nivel.id}>
                    <div className="px-4 py-1.5 bg-wine-50 border-b border-wine-100">
                      <span className="text-[11px] font-bold text-wine-800 uppercase tracking-wide">{nivel.nome}</span>
                    </div>
                    {(nivel.competencias ?? []).map((comp) => {
                      const sel = form.competencia_ids.includes(comp.id)
                      return (
                        <label
                          key={comp.id}
                          className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-wine-50/30 border-b border-gray-50 last:border-b-0 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                competencia_ids: sel
                                  ? f.competencia_ids.filter((id) => id !== comp.id)
                                  : [...f.competencia_ids, comp.id],
                              }))
                            }
                            className="rounded border-wine-300 text-wine-700 focus:ring-wine-500"
                          />
                          <span className="text-sm text-gray-800">{comp.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Ao registrar presença como "presente", todas as competências selecionadas serão marcadas como concluídas para cada cerimoniário.
            </p>
          </div>

          {/* Cerimoniários */}
          <div>
            <label className="label">Cerimoniários convidados ({form.cerimoniarios.length} selecionados)</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={cerSearch} onChange={(e) => setCerSearch(e.target.value)} placeholder="Filtrar..." className="input-field text-sm py-1.5 pl-8" />
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, cerimoniarios: cerimoniarios.map((c) => c.id) }))} className="text-xs text-wine-700 hover:text-wine-900 font-semibold whitespace-nowrap">Todos</button>
              <button type="button" onClick={() => setForm((f) => ({ ...f, cerimoniarios: [] }))} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Limpar</button>
            </div>
            <div className="max-h-40 overflow-y-auto border-2 border-wine-100 rounded-xl divide-y divide-gray-50">
              {filteredCers.map((c) => {
                const sel = form.cerimoniarios.includes(c.id)
                return (
                  <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-wine-50/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => setForm((f) => ({
                        ...f,
                        cerimoniarios: sel ? f.cerimoniarios.filter((id) => id !== c.id) : [...f.cerimoniarios, c.id],
                      }))}
                      className="rounded border-wine-300 text-wine-700 focus:ring-wine-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-400 text-[8px] font-bold">{c.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-gray-800">{c.nome}</span>
                    {c.experiente && <span className="ml-auto text-[10px] font-semibold text-amber-600">★ Experiente</span>}
                  </label>
                )
              })}
            </div>
          </div>

        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover Treinamento"
        message={`Remover o treinamento "${deleteTarget?.tema}"? Todas as presenças serão perdidas.`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

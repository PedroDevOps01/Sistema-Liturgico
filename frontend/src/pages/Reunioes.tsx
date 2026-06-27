import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  MessageCircle, Send, CheckCircle2, XCircle, AlertCircle,
  MinusCircle, Users, TrendingUp, Search, X, ClipboardList,
  BookOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Cerimoniario } from '../types'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { parseDate, parseDateParts, formatHorario } from '../lib/dateUtils'
import CalcNote from '../components/common/CalcNote'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReuniaoPresenca {
  id: number
  reuniao_id: number
  cerimoniario_id: number
  cerimoniario?: Cerimoniario
  status: 'presente' | 'ausente' | 'justificado' | null
  observacao?: string
}

interface Reuniao {
  id: number
  data: string
  horario: string
  tema: string
  local?: string
  tipo: string
  observacao?: string
  presencas: ReuniaoPresenca[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPOS: { value: string; label: string; color: string }[] = [
  { value: 'ordinaria',      label: 'Ordinária',      color: 'bg-blue-100 text-blue-700'     },
  { value: 'extraordinaria', label: 'Extraordinária',  color: 'bg-purple-100 text-purple-700' },
  { value: 'formacao',       label: 'Formação',        color: 'bg-green-100 text-green-700'   },
  { value: 'planejamento',   label: 'Planejamento',    color: 'bg-amber-100 text-amber-700'   },
  { value: 'outra',          label: 'Outra',           color: 'bg-gray-100 text-gray-600'     },
]

const TIPOS_DO_MES = ['ordinaria', 'extraordinaria', 'planejamento', 'outra']

const STATUS_CONFIG = {
  presente:    { label: 'Presente',    icon: <CheckCircle2 size={13} />, active: 'bg-green-600 text-white border-green-600', hover: 'hover:bg-green-50 hover:text-green-700 hover:border-green-300' },
  ausente:     { label: 'Ausente',     icon: <XCircle      size={13} />, active: 'bg-red-600   text-white border-red-600',   hover: 'hover:bg-red-50   hover:text-red-700   hover:border-red-300'   },
  justificado: { label: 'Justificado', icon: <AlertCircle  size={13} />, active: 'bg-amber-500 text-white border-amber-500', hover: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  const t = TIPOS.find(t => t.value === tipo)
  if (!t) return null
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
}

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

function SectionHeader({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-gray-700">{title}</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// ── Reunião Card ──────────────────────────────────────────────────────────────

function ReuniaoCard({
  r,
  onEdit,
  onDelete,
  onSilentReload,
}: {
  r: Reuniao
  onEdit: () => void
  onDelete: () => void
  onSilentReload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null)
  // Estado local para atualizar presença sem causar re-render + scroll da lista inteira
  const [localPresencas, setLocalPresencas] = useState<ReuniaoPresenca[]>(r.presencas)

  // Sincroniza quando o pai atualiza (ex: após edição do card)
  useEffect(() => { setLocalPresencas(r.presencas) }, [r.presencas])

  const presentes   = localPresencas.filter(p => p.status === 'presente').length
  const ausentes    = localPresencas.filter(p => p.status === 'ausente').length
  const justificado = localPresencas.filter(p => p.status === 'justificado').length
  const semStatus   = localPresencas.filter(p => !p.status).length

  async function handleStatus(p: ReuniaoPresenca, status: 'presente' | 'ausente' | 'justificado') {
    const novo = p.status === status ? null : status
    setLoadingStatus(p.cerimoniario_id)
    // Atualização otimista: muda o estado local imediatamente (sem scroll)
    setLocalPresencas(prev =>
      prev.map(pres =>
        pres.cerimoniario_id === p.cerimoniario_id ? { ...pres, status: novo } : pres
      )
    )
    try {
      await api.put(`/reunioes/${r.id}/presencas/${p.cerimoniario_id}`, { status: novo })
      onSilentReload() // sincroniza aba de frequência em background
    } catch {
      // Reverte em caso de erro
      setLocalPresencas(prev =>
        prev.map(pres =>
          pres.cerimoniario_id === p.cerimoniario_id ? { ...pres, status: p.status } : pres
        )
      )
      toast.error('Erro ao registrar presença')
    } finally {
      setLoadingStatus(null)
    }
  }

  async function handleConvite() {
    try {
      const res = await api.get<{ texto: string }>(`/reunioes/${r.id}/convite`)
      await navigator.clipboard.writeText(res.data.texto)
      toast.success('Convite copiado para área de transferência!')
    } catch {
      toast.error('Erro ao gerar convite')
    }
  }

  async function handleConviteWhatsApp() {
    try {
      const res = await api.get<{ texto: string }>(`/reunioes/${r.id}/convite`)
      window.open(`https://wa.me/?text=${encodeURIComponent(res.data.texto)}`, '_blank')
    } catch {
      toast.error('Erro ao gerar convite')
    }
  }

  return (
    <div className="border border-wine-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 bg-white hover:bg-wine-50/30 transition-colors text-left"
      >
        <DateBox data={r.data} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">
              {format(parseDate(r.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="text-xs text-gray-500">{formatHorario(r.horario)}</span>
            <TipoBadge tipo={r.tipo} />
          </div>
          <p className="text-sm font-semibold text-wine-900 mt-0.5 truncate">{r.tema}</p>
          {r.local && <p className="text-xs text-gray-400 mt-0.5">📍 {r.local}</p>}
        </div>

        {/* Presence pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {presentes   > 0 && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={11}/>{presentes}</span>}
          {ausentes    > 0 && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600"><XCircle size={11}/>{ausentes}</span>}
          {justificado > 0 && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"><AlertCircle size={11}/>{justificado}</span>}
          {semStatus   > 0 && <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400"><MinusCircle size={11}/>{semStatus}</span>}
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

      {/* Expanded: attendance */}
      {open && (
        <div className="border-t border-gray-100 bg-white divide-y divide-gray-50">
          {localPresencas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum cerimoniário convidado</p>
          ) : (
            localPresencas.map(p => (
              <div key={p.cerimoniario_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-400 text-[9px] font-bold">
                    {p.cerimoniario?.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
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

function FrequenciaTab({ reunioes }: { reunioes: Reuniao[] }) {
  type Row = { id: number; nome: string; total: number; presente: number; ausente: number; justificado: number; pct: number | null }

  const map = new Map<number, Row>()
  reunioes.forEach(r => {
    r.presencas.forEach(p => {
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
    .map(r => ({ ...r, pct: r.total > 0 ? Math.round(r.presente / r.total * 100) : null }))
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
          note: 'Cada reunião em que o cerimoniário foi convidado conta como 1 convite.',
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
                        {r.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{r.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">{r.total}</td>
                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="text-sm font-semibold text-green-700">{r.presente}</span></td>
                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="text-sm font-semibold text-red-600">{r.ausente}</span></td>
                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="text-sm font-semibold text-amber-600">{r.justificado}</span></td>
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
  tipo: string
  observacao: string
  cerimoniarios: number[]
}

function defaultForm(): FormState {
  return { data: '', horario: '', tema: '', local: '', tipo: 'ordinaria', observacao: '', cerimoniarios: [] }
}

export default function Reunioes() {
  const [list, setList] = useState<Reuniao[]>([])
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reuniao | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reuniao | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'lista' | 'frequencia'>('lista')
  const [cerSearch, setCerSearch] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<Reuniao[]>('/reunioes')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar reuniões')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload silencioso: não exibe spinner, não causa scroll para o topo
  const silentReload = useCallback(async () => {
    try {
      const r = await api.get<Reuniao[]>('/reunioes')
      setList(r.data)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<Cerimoniario[]>('/cerimoniarios').then(r => setCerimoniarios(r.data.filter(c => c.ativo))),
      loadList(),
    ])
  }, [loadList])

  function openNew() {
    setEditing(null)
    setForm(defaultForm())
    setModalOpen(true)
  }

  function openEdit(r: Reuniao) {
    setEditing(r)
    setForm({
      data:          r.data?.toString().substring(0, 10) ?? '',
      horario:       r.horario?.substring(0, 5) ?? '',
      tema:          r.tema ?? '',
      local:         r.local ?? '',
      tipo:          r.tipo ?? 'ordinaria',
      observacao:    r.observacao ?? '',
      cerimoniarios: r.presencas.map(p => p.cerimoniario_id),
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.data || !form.horario || !form.tema.trim()) {
      toast.error('Preencha data, horário e tema')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        local:      form.local      || null,
        observacao: form.observacao || null,
      }
      if (editing) {
        await api.put(`/reunioes/${editing.id}`, payload)
        toast.success('Reunião atualizada!')
      } else {
        await api.post('/reunioes', payload)
        toast.success('Reunião criada!')
      }
      setModalOpen(false)
      loadList()
    } catch {
      toast.error('Erro ao salvar reunião')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/reunioes/${deleteTarget.id}`)
      toast.success('Reunião removida')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover reunião')
    }
  }

  function toggleCerimoniario(id: number) {
    setForm(f => ({
      ...f,
      cerimoniarios: f.cerimoniarios.includes(id)
        ? f.cerimoniarios.filter(x => x !== id)
        : [...f.cerimoniarios, id],
    }))
  }

  function selecionarTodos() {
    const ativos = cerimoniarios.filter(c => c.ativo).map(c => c.id)
    setForm(f => ({ ...f, cerimoniarios: ativos }))
  }

  const filtered = list.filter(r =>
    !search ||
    r.tema.toLowerCase().includes(search.toLowerCase()) ||
    r.local?.toLowerCase().includes(search.toLowerCase()) ||
    r.data.includes(search)
  )

  const filteredDoMes    = filtered.filter(r => TIPOS_DO_MES.includes(r.tipo))
  const filteredFormacao = filtered.filter(r => r.tipo === 'formacao')

  const cerFiltrados = cerimoniarios.filter(c =>
    !cerSearch || c.nome.toLowerCase().includes(cerSearch.toLowerCase())
  )

  // Stats
  const totalDoMes    = list.filter(r => TIPOS_DO_MES.includes(r.tipo)).length
  const totalFormacao = list.filter(r => r.tipo === 'formacao').length
  const totalConvites = list.reduce((s, r) => s + r.presencas.length, 0)
  const totalPresentes = list.reduce((s, r) => s + r.presencas.filter(p => p.status === 'presente').length, 0)
  const mediaPresenca  = totalConvites > 0 ? Math.round(totalPresentes / totalConvites * 100) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniões"
        subtitle={`${list.length} ${list.length === 1 ? 'reunião cadastrada' : 'reuniões cadastradas'}`}
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus size={18} /> Nova Reunião
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-wine-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDoMes}</p>
              <p className="text-xs text-gray-500">Reuniões do mês</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <BookOpen size={20} className="text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalFormacao}</p>
              <p className="text-xs text-gray-500">Reuniões de formação</p>
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
        {(['lista', 'frequencia'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t ? 'bg-white text-wine-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'lista' ? <><ClipboardList size={15} /> Reuniões</> : <><TrendingUp size={15} /> Frequência</>}
          </button>
        ))}
      </div>

      {activeTab === 'lista' && (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por tema, local ou data..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 pr-10"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-40"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">{search ? 'Nenhuma reunião encontrada' : 'Nenhuma reunião cadastrada'}</p>
              {!search && (
                <button onClick={openNew} className="btn-primary mt-4">
                  <Plus size={16} /> Nova Reunião
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Reunião do Mês */}
              <SectionHeader
                title="Reunião do Mês"
                count={filteredDoMes.length}
                icon={<ClipboardList size={15} className="text-wine-700" />}
              />
              {filteredDoMes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma reunião do mês</p>
              ) : (
                filteredDoMes.map(r => (
                  <ReuniaoCard
                    key={r.id}
                    r={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setDeleteTarget(r)}
                    onSilentReload={silentReload}
                  />
                ))
              )}

              {/* Reuniões de Formação */}
              <SectionHeader
                title="Reuniões de Formação"
                count={filteredFormacao.length}
                icon={<BookOpen size={15} className="text-green-700" />}
              />
              {filteredFormacao.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma reunião de formação</p>
              ) : (
                filteredFormacao.map(r => (
                  <ReuniaoCard
                    key={r.id}
                    r={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setDeleteTarget(r)}
                    onSilentReload={silentReload}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'frequencia' && <FrequenciaTab reunioes={list} />}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Reunião' : 'Nova Reunião'}
        size="lg"
        footer={<>
          <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar reunião'}
          </button>
        </>}
      >
        <div className="space-y-5">
          {/* Data / Horário / Tipo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="label">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Horário *</label>
              <input
                type="time"
                value={form.horario}
                onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="select-field"
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tema */}
          <div>
            <label className="label">Pauta / Tema *</label>
            <input
              type="text"
              value={form.tema}
              onChange={e => setForm(f => ({ ...f, tema: e.target.value }))}
              placeholder="Ex: Planejamento das celebrações de julho"
              className="input-field"
            />
          </div>

          {/* Local */}
          <div>
            <label className="label">Local</label>
            <input
              type="text"
              value={form.local}
              onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              placeholder="Ex: Sacristia, Sala de reuniões..."
              className="input-field"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="label">Observação</label>
            <textarea
              value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Informações adicionais..."
            />
          </div>

          {/* Cerimoniários */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                Cerimoniários convidados
                <span className="ml-1.5 text-xs font-normal text-gray-400">({form.cerimoniarios.length} selecionados)</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selecionarTodos} className="text-xs text-wine-700 hover:underline font-medium">
                  Todos
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, cerimoniarios: [] }))} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                  Limpar
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar cerimoniários..."
                value={cerSearch}
                onChange={e => setCerSearch(e.target.value)}
                className="input-field text-sm py-2 pl-8"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border-2 border-wine-100 rounded-xl divide-y divide-gray-50">
              {cerFiltrados.map(c => {
                const selected = form.cerimoniarios.includes(c.id)
                return (
                  <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-wine-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCerimoniario(c.id)}
                      className="rounded border-wine-300 text-wine-700 focus:ring-wine-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-400 text-[9px] font-bold">
                        {c.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                    {c.mestre && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold ml-auto">Mestre</span>}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        title="Remover Reunião"
        message={`Tem certeza que deseja remover a reunião "${deleteTarget?.tema}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
      />
    </div>
  )
}

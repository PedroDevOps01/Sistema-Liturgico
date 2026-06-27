import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp, Search, BookOpen, Users,
  ArrowLeft, Award, FileText, Upload, Eye, X, EyeOff, GraduationCap,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { getToken } from '../lib/auth'
import { parsePdf, type ConteudoEstruturado, type Topico } from '../lib/pdfParser'
import type {
  FormacaoNivel, FormacaoCompetencia, FormacaoProgresso,
  FormacaoOverviewItem, Cerimoniario,
} from '../types'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Badge from '../components/common/Badge'
import CalcNote from '../components/common/CalcNote'

// ─── Schemas ────────────────────────────────────────────────────────────────

const nivelSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  descricao: z.string().optional(),
  ordem: z.number().int().min(1),
  cor: z.string().min(1),
})
type NivelForm = z.infer<typeof nivelSchema>

const competenciaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  descricao: z.string().optional(),
  obrigatoria: z.boolean(),
  ordem: z.number().int().min(1),
})
type CompetenciaForm = z.infer<typeof competenciaSchema>

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRESET_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#c2410c', '#7c3aed', '#0891b2', '#be185d']

function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color ?? '#7c2d3e' }}
      />
    </div>
  )
}

function formatDateBR(iso: string | null | undefined) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) } catch { return iso }
}

// ─── Main component ──────────────────────────────────────────────────────────

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface HistoricoItem {
  id: number
  data: string
  competencia: string
  nivel: string
  observacao?: string | null
}

// ─── Documento de Formação types ────────────────────────────────────────────

interface DocFormacao {
  id: number
  titulo: string
  descricao: string | null
  tipo: string
  arquivo_nome: string
  mime_type: string
  ativo: boolean
  created_at: string
  conteudo_estruturado: ConteudoEstruturado | null
}

// ─── Leitor de Documento ─────────────────────────────────────────────────────

function TopicoItem({ topico, defaultOpen = false }: { topico: Topico; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{topico.titulo}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && topico.conteudo && (
        <div className="px-5 pb-4 pt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border-t border-gray-50">
          {topico.conteudo}
        </div>
      )}
    </div>
  )
}

function LivroViewer({
  doc, onClose,
}: {
  doc: DocFormacao
  onClose: () => void
}) {
  const topicos = doc.conteudo_estruturado?.topicos ?? []
  const [topicoAtivo, setTopicoAtivo] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10" style={{ background: '#1a1a1a' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#7c2d3e20' }}>
          <BookOpen size={17} style={{ color: '#c4a24a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{doc.titulo}</p>
          {doc.descricao && <p className="text-xs text-white/40 truncate">{doc.descricao}</p>}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Índice */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-white/10 py-4 hidden md:block" style={{ background: '#141414' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-5 mb-3">Índice</p>
          {topicos.map((t, i) => (
            <button
              key={i}
              onClick={() => setTopicoAtivo(i)}
              className={`w-full text-left px-5 py-2.5 text-xs transition-colors ${
                topicoAtivo === i
                  ? 'text-amber-400 bg-white/5 font-semibold border-r-2 border-amber-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="text-white/30 mr-2">{String(i + 1).padStart(2, '0')}</span>
              {t.titulo}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {topicos.length === 0 ? (
              <div className="text-center text-white/30 mt-20">
                <BookOpen size={40} className="mx-auto mb-3" />
                <p>Nenhum conteúdo estruturado encontrado</p>
              </div>
            ) : (
              topicos.map((t, i) => (
                <div key={i} className="mb-12">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-xs font-mono text-amber-500/60">{String(i + 1).padStart(2, '0')}</span>
                    <h2 className="text-xl font-bold text-white">{t.titulo}</h2>
                  </div>
                  {t.conteudo ? (
                    <p className="text-white/70 text-sm leading-[1.85] whitespace-pre-wrap">{t.conteudo}</p>
                  ) : (
                    <p className="text-white/30 text-sm italic">Sem conteúdo</p>
                  )}
                  {i < topicos.length - 1 && (
                    <div className="mt-10 border-t border-white/5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-2 px-4 py-3 border-t border-white/10 overflow-x-auto" style={{ background: '#1a1a1a' }}>
        {topicos.map((_, i) => (
          <button
            key={i}
            onClick={() => setTopicoAtivo(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
              topicoAtivo === i ? 'bg-amber-500 text-gray-900 font-bold' : 'bg-white/10 text-white/60'
            }`}
          >
            {String(i + 1).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Formacao() {
  const [activeTab, setActiveTab] = useState<'estrutura' | 'progresso' | 'historico' | 'documentos'>('estrutura')
  const [niveis, setNiveis] = useState<FormacaoNivel[]>([])
  const [loading, setLoading] = useState(true)

  // Estrutura modals
  const [modalNivel, setModalNivel] = useState(false)
  const [modalCompetencia, setModalCompetencia] = useState(false)
  const [editNivel, setEditNivel] = useState<FormacaoNivel | null>(null)
  const [editComp, setEditComp] = useState<FormacaoCompetencia | null>(null)
  const [currentNivelId, setCurrentNivelId] = useState<number | null>(null)
  const [deleteNivel, setDeleteNivel] = useState<FormacaoNivel | null>(null)
  const [deleteComp, setDeleteComp] = useState<FormacaoCompetencia | null>(null)

  // Progresso
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [overview, setOverview] = useState<FormacaoOverviewItem[]>([])
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [searchCer, setSearchCer] = useState('')
  const [selectedCer, setSelectedCer] = useState<Cerimoniario | null>(null)
  const [progresso, setProgresso] = useState<FormacaoProgresso | null>(null)
  const [progressoLoading, setProgressoLoading] = useState(false)
  const [expandedNiveis, setExpandedNiveis] = useState<Record<number, boolean>>({})

  // Histórico
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [historicoLoading, setHistoricoLoading] = useState(false)
  const [historicoCer, setHistoricoCer] = useState<Cerimoniario | null>(null)
  const [searchHistorico, setSearchHistorico] = useState('')

  // Documentos
  const [docs, setDocs] = useState<DocFormacao[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docViewer, setDocViewer] = useState<DocFormacao | null>(null)
  const [docUpload, setDocUpload] = useState<{
    titulo: string
    descricao: string
    arquivo_nome: string
    arquivo_base64: string
    mime_type: string
    conteudo: ConteudoEstruturado | null
  } | null>(null)
  const [docParsing, setDocParsing] = useState(false)
  const [docSalvando, setDocSalvando] = useState(false)
  const [docPreview, setDocPreview] = useState(false)
  const [docDragging, setDocDragging] = useState(false)
  const docFileRef = useRef<HTMLInputElement>(null)

  // Forms
  const nivelForm = useForm<NivelForm>({
    resolver: zodResolver(nivelSchema),
    defaultValues: { nome: '', descricao: '', ordem: 1, cor: '#3b82f6' },
  })
  const compForm = useForm<CompetenciaForm>({
    resolver: zodResolver(competenciaSchema),
    defaultValues: { nome: '', descricao: '', obrigatoria: false, ordem: 1 },
  })

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadNiveis = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<FormacaoNivel[]>('/formacao/niveis')
      setNiveis(r.data)
    } catch {
      toast.error('Erro ao carregar níveis')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const [oRes, cRes] = await Promise.all([
        api.get<FormacaoOverviewItem[]>('/formacao/overview'),
        api.get<Cerimoniario[]>('/cerimoniarios'),
      ])
      setOverview(oRes.data)
      setCerimoniarios(cRes.data)
    } catch {
      toast.error('Erro ao carregar overview')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => { loadNiveis() }, [loadNiveis])

  useEffect(() => {
    if ((activeTab === 'progresso' || activeTab === 'historico') && overview.length === 0) {
      loadOverview()
    }
  }, [activeTab, overview.length, loadOverview])

  async function loadProgresso(cer: Cerimoniario) {
    setSelectedCer(cer)
    setProgressoLoading(true)
    try {
      const r = await api.get<FormacaoProgresso>(`/formacao/cerimoniario/${cer.id}`)
      setProgresso(r.data)
      const expanded: Record<number, boolean> = {}
      r.data.niveis.forEach(n => { expanded[n.id] = true })
      setExpandedNiveis(expanded)
    } catch {
      toast.error('Erro ao carregar progresso')
    } finally {
      setProgressoLoading(false)
    }
  }

  async function loadHistorico(cer: Cerimoniario) {
    setHistoricoCer(cer)
    setHistoricoLoading(true)
    try {
      const r = await api.get<HistoricoItem[]>(`/formacao/cerimoniario/${cer.id}/historico`)
      setHistorico(r.data)
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setHistoricoLoading(false)
    }
  }

  const loadDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const r = await api.get<DocFormacao[]>('/documentos')
      setDocs((Array.isArray(r.data) ? r.data : []).filter(d => d.tipo === 'formacao'))
    } catch {
      toast.error('Erro ao carregar documentos')
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'documentos' && docs.length === 0) loadDocs()
  }, [activeTab, docs.length, loadDocs])

  async function handleDocFile(file: File) {
    setDocParsing(true)
    try {
      const base64: string = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = e => res(e.target?.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      toast.loading('Lendo e estruturando o PDF...', { id: 'pdf-parse' })
      const conteudo = await parsePdf(base64)
      toast.success(`${conteudo.topicos.length} tópicos detectados!`, { id: 'pdf-parse' })
      setDocUpload(prev => ({
        titulo: prev?.titulo ?? file.name.replace(/\.pdf$/i, ''),
        descricao: prev?.descricao ?? '',
        arquivo_nome: file.name,
        arquivo_base64: base64,
        mime_type: file.type || 'application/pdf',
        conteudo,
      }))
      setDocPreview(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar PDF', { id: 'pdf-parse' })
    } finally {
      setDocParsing(false)
    }
  }

  async function handleDocSalvar() {
    if (!docUpload?.arquivo_base64) return toast.error('Selecione um arquivo PDF')
    if (!docUpload.titulo.trim()) return toast.error('Informe o título')
    setDocSalvando(true)
    try {
      await api.post('/documentos', {
        titulo: docUpload.titulo,
        descricao: docUpload.descricao || null,
        tipo: 'formacao',
        arquivo_nome: docUpload.arquivo_nome,
        arquivo_base64: docUpload.arquivo_base64,
        mime_type: docUpload.mime_type,
        conteudo_estruturado: docUpload.conteudo,
      })
      toast.success('Documento salvo!')
      setDocUpload(null)
      setDocPreview(false)
      loadDocs()
    } catch {
      toast.error('Erro ao salvar documento')
    } finally {
      setDocSalvando(false)
    }
  }

  async function handleDocDeletar(id: number) {
    if (!confirm('Remover este documento?')) return
    try {
      await api.delete(`/documentos/${id}`)
      toast.success('Removido!')
      setDocs(d => d.filter(x => x.id !== id))
    } catch { toast.error('Erro ao remover') }
  }

  // ─── Estrutura handlers ────────────────────────────────────────────────────

  function openCreateNivel() {
    setEditNivel(null)
    nivelForm.reset({ nome: '', descricao: '', ordem: niveis.length + 1, cor: '#3b82f6' })
    setModalNivel(true)
  }

  function openEditNivel(n: FormacaoNivel) {
    setEditNivel(n)
    nivelForm.reset({ nome: n.nome, descricao: n.descricao ?? '', ordem: n.ordem, cor: n.cor })
    setModalNivel(true)
  }

  function openCreateComp(nivelId: number) {
    setEditComp(null)
    setCurrentNivelId(nivelId)
    const nivel = niveis.find(n => n.id === nivelId)
    const ordem = (nivel?.competencias?.length ?? 0) + 1
    compForm.reset({ nome: '', descricao: '', obrigatoria: false, ordem })
    setModalCompetencia(true)
  }

  function openEditComp(comp: FormacaoCompetencia) {
    setEditComp(comp)
    setCurrentNivelId(comp.formacao_nivel_id)
    compForm.reset({ nome: comp.nome, descricao: comp.descricao ?? '', obrigatoria: comp.obrigatoria, ordem: comp.ordem })
    setModalCompetencia(true)
  }

  async function onSaveNivel(data: NivelForm) {
    try {
      if (editNivel) {
        await api.put(`/formacao/niveis/${editNivel.id}`, data)
        toast.success('Nível atualizado!')
      } else {
        await api.post('/formacao/niveis', data)
        toast.success('Nível criado!')
      }
      setModalNivel(false)
      loadNiveis()
    } catch {
      toast.error('Erro ao salvar nível')
    }
  }

  async function onSaveComp(data: CompetenciaForm) {
    try {
      if (editComp) {
        await api.put(`/formacao/competencias/${editComp.id}`, data)
        toast.success('Competência atualizada!')
      } else if (currentNivelId) {
        await api.post(`/formacao/niveis/${currentNivelId}/competencias`, data)
        toast.success('Competência adicionada!')
      }
      setModalCompetencia(false)
      loadNiveis()
    } catch {
      toast.error('Erro ao salvar competência')
    }
  }

  async function onDeleteNivel() {
    if (!deleteNivel) return
    try {
      await api.delete(`/formacao/niveis/${deleteNivel.id}`)
      toast.success('Nível removido!')
      setDeleteNivel(null)
      loadNiveis()
    } catch {
      toast.error('Erro ao remover nível')
    }
  }

  async function onDeleteComp() {
    if (!deleteComp) return
    try {
      await api.delete(`/formacao/competencias/${deleteComp.id}`)
      toast.success('Competência removida!')
      setDeleteComp(null)
      loadNiveis()
    } catch {
      toast.error('Erro ao remover competência')
    }
  }

  // ─── Progresso handlers ────────────────────────────────────────────────────

  async function toggleCompetencia(nivelId: number, compId: number, concluida: boolean) {
    if (!selectedCer) return
    try {
      await api.put(`/formacao/cerimoniario/${selectedCer.id}/competencia/${compId}`, {
        concluida,
        data_conclusao: concluida ? new Date().toISOString().split('T')[0] : null,
      })
      // Optimistic update
      setProgresso(prev => {
        if (!prev) return prev
        return {
          ...prev,
          niveis: prev.niveis.map(n => {
            if (n.id !== nivelId) return n
            const newComps = n.competencias.map(c =>
              c.id === compId
                ? { ...c, concluida, data_conclusao: concluida ? new Date().toISOString().split('T')[0] : null }
                : c
            )
            const concluidas = newComps.filter(c => c.concluida).length
            return { ...n, competencias: newComps, concluidas, pct: n.total > 0 ? Math.round(concluidas / n.total * 100) : 0 }
          }),
          pct_total: 0, // will recalc below
        }
      })
      // Full reload for accurate totals
      const r = await api.get<FormacaoProgresso>(`/formacao/cerimoniario/${selectedCer.id}`)
      setProgresso(r.data)
    } catch {
      toast.error('Erro ao atualizar competência')
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filteredCerimoniarios = cerimoniarios
    .filter(c => c.ativo && c.nome.toLowerCase().includes(searchCer.toLowerCase()))
    .slice(0, 8)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formação"
        subtitle="Formação litúrgica e para o serviço — gerencie níveis, competências e o progresso de cada cerimoniário"
        action={
          activeTab === 'estrutura' ? (
            <button onClick={openCreateNivel} className="btn-primary">
              <Plus size={18} />
              Novo Nível
            </button>
          ) : undefined
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['estrutura', 'progresso', 'historico'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab ? 'bg-white shadow-sm text-wine-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'estrutura' ? 'Estrutura' : tab === 'progresso' ? 'Progresso' : 'Histórico'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ESTRUTURA TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'estrutura' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))
          ) : niveis.length === 0 ? (
            <div className="card p-16 text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-500">Nenhum nível de formação</p>
              <p className="text-sm text-gray-400 mt-1">Crie o primeiro nível clicando em "Novo Nível".</p>
            </div>
          ) : (
            niveis.sort((a, b) => a.ordem - b.ordem).map(nivel => (
              <div key={nivel.id} className="card overflow-hidden">
                {/* Nivel header */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ backgroundColor: nivel.cor + '20', borderLeft: `4px solid ${nivel.cor}` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: nivel.cor }}
                    />
                    <div>
                      <h3 className="font-bold text-gray-900">{nivel.nome}</h3>
                      {nivel.descricao && (
                        <p className="text-sm text-gray-500 mt-0.5">{nivel.descricao}</p>
                      )}
                    </div>
                    <Badge variant="gray" size="sm">Ordem {nivel.ordem}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCreateComp(nivel.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-wine-900 hover:bg-wine-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={12} />
                      Competência
                    </button>
                    <button
                      onClick={() => openEditNivel(nivel)}
                      className="p-1.5 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteNivel(nivel)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Competências */}
                {nivel.competencias && nivel.competencias.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {nivel.competencias.sort((a, b) => a.ordem - b.ordem).map(comp => (
                      <div key={comp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <span className="text-xs text-gray-400 w-5 text-center font-mono">{comp.ordem}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{comp.nome}</p>
                          {comp.descricao && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{comp.descricao}</p>
                          )}
                        </div>
                        {comp.obrigatoria && <Badge variant="orange" size="sm">Obrigatória</Badge>}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditComp(comp)}
                            className="p-1.5 text-gray-400 hover:text-wine-900 hover:bg-wine-50 rounded-lg transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteComp(comp)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-gray-400 italic">
                    Nenhuma competência cadastrada.{' '}
                    <button
                      onClick={() => openCreateComp(nivel.id)}
                      className="text-wine-700 hover:underline"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PROGRESSO TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'progresso' && (
        <div className="space-y-5">

          {/* ── Back button (detail mode) OR search (list mode) ── */}
          {selectedCer ? (
            <button
              onClick={() => { setSelectedCer(null); setProgresso(null) }}
              className="flex items-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 hover:bg-wine-50 px-3 py-2 rounded-xl transition-colors -ml-1 self-start"
            >
              <ArrowLeft size={17} />
              Voltar para listagem
            </button>
          ) : (
            <div className="card p-4">
              <label className="label mb-2">Selecionar Cerimoniário</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchCer}
                  onChange={e => setSearchCer(e.target.value)}
                  placeholder="Buscar cerimoniário..."
                  className="input-field pl-10"
                />
              </div>
              {searchCer && (
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {filteredCerimoniarios.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Nenhum resultado</p>
                  ) : (
                    filteredCerimoniarios.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSearchCer(''); loadProgresso(c) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-wine-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-400 text-xs font-bold">
                            {c.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                          {c.numero && <p className="text-xs text-gray-400">{c.numero}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observação de cálculo — progresso de formação */}
          {!selectedCer && (
            <CalcNote items={[
              {
                label: 'Progresso Total (barra)',
                formula: 'Competências concluídas ÷ Total de competências de todos os níveis × 100',
                note: 'Inclui competências obrigatórias e opcionais de todos os níveis cadastrados.',
              },
              {
                label: 'Progresso por Nível',
                formula: 'Competências concluídas no nível ÷ Total do nível × 100',
                note: 'Calculado independentemente para cada nível — o progresso total não é a média dos níveis.',
              },
            ]} />
          )}

          {/* Overview mode */}
          {!selectedCer && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 bg-wine-900">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Users size={16} />
                  Visão Geral dos Cerimoniários
                </h3>
              </div>
              {overviewLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-10 rounded" />
                  ))}
                </div>
              ) : overview.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">Nenhum dado disponível</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Cerimoniário</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Nível Atual</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overview.map(item => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          const cer = cerimoniarios.find(c => c.id === item.id)
                          if (cer) loadProgresso(cer)
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900 text-sm">{item.nome}</p>
                          {item.numero && <p className="text-xs text-gray-400">{item.numero}</p>}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-sm text-gray-600">{item.nivel_atual_nome ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1">
                              <ProgressBar pct={item.pct_total} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-9 text-right">
                              {item.pct_total}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Per-cerimoniário mode */}
          {selectedCer && (
            <div className="space-y-4">
              {/* Header */}
              <div className="card p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 font-bold">
                      {selectedCer.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedCer.nome}</h3>
                    {selectedCer.numero && <p className="text-sm text-gray-400">{selectedCer.numero}</p>}
                  </div>
                </div>
                {progresso && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ProgressBar pct={progresso.pct_total} />
                    </div>
                    <span className="text-2xl font-bold text-wine-900">{progresso.pct_total}%</span>
                  </div>
                )}
              </div>

              {/* Levels */}
              {progressoLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-5 space-y-3">
                    <div className="skeleton h-6 w-48 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                  </div>
                ))
              ) : progresso ? (
                progresso.niveis.map(nivel => {
                  const isExpanded = expandedNiveis[nivel.id] ?? true
                  return (
                    <div key={nivel.id} className="card overflow-hidden">
                      <div
                        className="px-5 py-4 flex items-center justify-between"
                        style={{ borderLeft: `4px solid ${nivel.cor}` }}
                      >
                        <button
                          className="flex-1 flex items-center gap-3 text-left"
                          onClick={() => setExpandedNiveis(p => ({ ...p, [nivel.id]: !isExpanded }))}
                        >
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{nivel.nome}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {nivel.concluidas}/{nivel.total} competências concluídas
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 hidden sm:block">
                              <ProgressBar pct={nivel.pct} color={nivel.cor} />
                            </div>
                            <span className="text-sm font-bold text-gray-700 w-10 text-right">{nivel.pct}%</span>
                            {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          </div>
                        </button>
                        {nivel.pct === 100 && selectedCer && (
                          <button
                            onClick={async e => {
                              e.stopPropagation()
                              try {
                                const res = await fetch(
                                  `${apiBase}/api/formacao/cerimoniario/${selectedCer.id}/certificado/${nivel.id}`,
                                  { headers: { Authorization: `Bearer ${getToken()}` } }
                                )
                                if (!res.ok) throw new Error()
                                const blob = await res.blob()
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `certificado-${selectedCer.nome}-${nivel.nome}.pdf`
                                a.click()
                                URL.revokeObjectURL(url)
                              } catch {
                                toast.error('Erro ao gerar certificado')
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium bg-gold-500 text-wine-900 rounded-lg px-3 py-1.5 hover:bg-gold-400 transition-colors ml-3 flex-shrink-0"
                          >
                            <Award size={13} />
                            Certificado
                          </button>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="divide-y divide-gray-100">
                          {nivel.competencias.map(comp => (
                            <label
                              key={comp.id}
                              className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${comp.concluida ? 'bg-green-50/50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={comp.concluida ?? false}
                                onChange={e => toggleCompetencia(nivel.id, comp.id, e.target.checked)}
                                className="w-4 h-4 rounded accent-wine-900"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${comp.concluida ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {comp.nome}
                                </p>
                                {comp.descricao && (
                                  <p className="text-xs text-gray-400 mt-0.5">{comp.descricao}</p>
                                )}
                              </div>
                              {comp.obrigatoria && <Badge variant="orange" size="sm">Obrigatória</Badge>}
                              {comp.concluida && comp.data_conclusao && (
                                <span className="text-xs text-green-600 font-medium flex-shrink-0">
                                  {formatDateBR(comp.data_conclusao)}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HISTÓRICO TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'historico' && (
        <div className="space-y-5">
          {/* Cerimoniário picker */}
          <div className="card p-4">
            <label className="label mb-2">Selecionar Cerimoniário</label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchHistorico}
                onChange={e => setSearchHistorico(e.target.value)}
                placeholder="Buscar cerimoniário..."
                className="input-field pl-10"
              />
            </div>
            {searchHistorico && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {cerimoniarios
                  .filter(c => c.ativo && c.nome.toLowerCase().includes(searchHistorico.toLowerCase()))
                  .slice(0, 8)
                  .length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Nenhum resultado</p>
                ) : (
                  cerimoniarios
                    .filter(c => c.ativo && c.nome.toLowerCase().includes(searchHistorico.toLowerCase()))
                    .slice(0, 8)
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSearchHistorico(''); loadHistorico(c) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-wine-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-400 text-xs font-bold">
                            {c.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                          {c.numero && <p className="text-xs text-gray-400">{c.numero}</p>}
                        </div>
                      </button>
                    ))
                )}
              </div>
            )}
          </div>

          {/* Histórico table */}
          {historicoCer && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Histórico de {historicoCer.nome}
                </h3>
              </div>
              {historicoLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-10 rounded" />
                  ))}
                </div>
              ) : historico.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  Nenhum registro de formação encontrado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Data</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Competência</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Nível</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historico.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {formatDateBR(h.data)}
                          </td>
                          <td className="px-5 py-3 text-gray-800">{h.competencia}</td>
                          <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{h.nivel}</td>
                          <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{h.observacao ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!historicoCer && (
            <div className="card p-16 text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-500">Busque um cerimoniário para ver o histórico</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOCUMENTOS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'documentos' && (
        <div className="space-y-5">

          {/* ── Upload area ── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <GraduationCap size={17} className="text-wine-900" />
                  Documentos de Formação
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Faça upload de um PDF — ele será lido e exibido como livro de estudos para os membros
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDocDragging(true) }}
              onDragLeave={() => setDocDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDocDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleDocFile(file)
              }}
              onClick={() => docFileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                docDragging
                  ? 'border-wine-500 bg-wine-50'
                  : 'border-gray-200 hover:border-wine-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={docFileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocFile(f) }}
              />
              {docParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-wine-200 border-t-wine-700 animate-spin" />
                  <p className="text-sm font-medium text-gray-600">Lendo e estruturando o PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: '#7c2d3e15' }}>
                    <Upload size={22} className="text-wine-700" />
                  </div>
                  <p className="font-semibold text-gray-700">Arraste um PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-gray-400">Somente arquivos .pdf · O conteúdo será extraído automaticamente</p>
                </div>
              )}
            </div>

            {/* Form após upload */}
            {docUpload && !docParsing && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fdf4' }}>
                  <FileText size={16} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800 truncate">{docUpload.arquivo_nome}</p>
                    <p className="text-xs text-green-600">
                      {docUpload.conteudo?.topicos.length ?? 0} tópicos detectados · {docUpload.conteudo?.total_paginas ?? '?'} páginas
                    </p>
                  </div>
                  <button
                    onClick={() => { setDocUpload(null); setDocPreview(false) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Título do Documento *</label>
                    <input
                      className="input-field"
                      value={docUpload.titulo}
                      onChange={e => setDocUpload(d => d ? { ...d, titulo: e.target.value } : d)}
                      placeholder="Ex: Diretório Litúrgico 2025"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Descrição (opcional)</label>
                    <textarea
                      className="input-field resize-none"
                      rows={2}
                      value={docUpload.descricao}
                      onChange={e => setDocUpload(d => d ? { ...d, descricao: e.target.value } : d)}
                      placeholder="Breve descrição do documento..."
                    />
                  </div>
                </div>

                {/* Preview dos tópicos */}
                <div>
                  <button
                    onClick={() => setDocPreview(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-wine-700 hover:text-wine-900 transition-colors"
                  >
                    {docPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    {docPreview ? 'Ocultar preview' : `Visualizar ${docUpload.conteudo?.topicos.length ?? 0} tópicos detectados`}
                  </button>
                  {docPreview && docUpload.conteudo && (
                    <div className="mt-3 space-y-0.5 max-h-72 overflow-y-auto pr-1">
                      {docUpload.conteudo.topicos.map((t, i) => (
                        <TopicoItem key={i} topico={t} defaultOpen={i === 0} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDocSalvar}
                    disabled={docSalvando}
                    className="btn-primary disabled:opacity-60 flex items-center gap-2"
                  >
                    {docSalvando ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando...</>
                    ) : (
                      <><FileText size={15} /> Salvar Documento</>
                    )}
                  </button>
                  <button
                    onClick={() => { setDocUpload(null); setDocPreview(false) }}
                    className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Lista de documentos ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 bg-wine-900 flex items-center gap-2">
              <BookOpen size={16} className="text-gold-400" />
              <h3 className="font-semibold text-white text-sm">Documentos Publicados</h3>
            </div>

            {docsLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="p-14 text-center">
                <FileText size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-500 font-medium text-sm">Nenhum documento publicado</p>
                <p className="text-xs text-gray-400 mt-1">Faça upload de um PDF acima para começar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#7c2d3e12' }}>
                      <BookOpen size={18} className="text-wine-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{doc.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.conteudo_estruturado
                          ? `${doc.conteudo_estruturado.topicos.length} tópicos · ${doc.conteudo_estruturado.total_paginas} pág.`
                          : doc.arquivo_nome}
                        {' · '}{format(parseISO(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.conteudo_estruturado && (
                        <button
                          onClick={() => setDocViewer(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                          style={{ background: '#7c2d3e15', color: '#7c2d3e' }}
                        >
                          <Eye size={13} /> Ler
                        </button>
                      )}
                      <button
                        onClick={() => handleDocDeletar(doc.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LivroViewer fullscreen ──────────────────────────────────────────── */}
      {docViewer && <LivroViewer doc={docViewer} onClose={() => setDocViewer(null)} />}

      {/* ── Modal Nível ────────────────────────────────────────────────────── */}

      <Modal
        isOpen={modalNivel}
        onClose={() => setModalNivel(false)}
        title={editNivel ? 'Editar Nível' : 'Novo Nível'}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalNivel(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-nivel" disabled={nivelForm.formState.isSubmitting} className="btn-primary">
              {nivelForm.formState.isSubmitting ? 'Salvando...' : editNivel ? 'Atualizar' : 'Criar'}
            </button>
          </>
        }
      >
        <form id="form-nivel" onSubmit={nivelForm.handleSubmit(onSaveNivel)} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...nivelForm.register('nome')} className="input-field" placeholder="Ex: Nível Básico" />
            {nivelForm.formState.errors.nome && (
              <p className="text-red-600 text-sm mt-1">{nivelForm.formState.errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea {...nivelForm.register('descricao')} rows={2} className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Ordem</label>
            <input
              {...nivelForm.register('ordem', { valueAsNumber: true })}
              type="number"
              min={1}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => nivelForm.setValue('cor', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    nivelForm.watch('cor') === c ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                {...nivelForm.register('cor')}
                type="color"
                className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"
                title="Cor personalizada"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Modal Competência ──────────────────────────────────────────────── */}
      <Modal
        isOpen={modalCompetencia}
        onClose={() => setModalCompetencia(false)}
        title={editComp ? 'Editar Competência' : 'Nova Competência'}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalCompetencia(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-comp" disabled={compForm.formState.isSubmitting} className="btn-primary">
              {compForm.formState.isSubmitting ? 'Salvando...' : editComp ? 'Atualizar' : 'Adicionar'}
            </button>
          </>
        }
      >
        <form id="form-comp" onSubmit={compForm.handleSubmit(onSaveComp)} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...compForm.register('nome')} className="input-field" placeholder="Ex: Conhecer os gestos litúrgicos básicos" />
            {compForm.formState.errors.nome && (
              <p className="text-red-600 text-sm mt-1">{compForm.formState.errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea {...compForm.register('descricao')} rows={2} className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Ordem</label>
            <input
              {...compForm.register('ordem', { valueAsNumber: true })}
              type="number"
              min={1}
              className="input-field"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...compForm.register('obrigatoria')}
              className="w-4 h-4 rounded accent-wine-900"
            />
            <span className="text-sm font-medium text-gray-700">Competência obrigatória</span>
          </label>
        </form>
      </Modal>

      {/* ── Confirm Delete Nivel ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteNivel}
        title="Remover Nível"
        message={`Tem certeza que deseja remover o nível "${deleteNivel?.nome}"? Todas as competências deste nível serão removidas.`}
        confirmLabel="Remover"
        onConfirm={onDeleteNivel}
        onCancel={() => setDeleteNivel(null)}
        variant="danger"
      />

      {/* ── Confirm Delete Competência ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteComp}
        title="Remover Competência"
        message={`Tem certeza que deseja remover a competência "${deleteComp?.nome}"?`}
        confirmLabel="Remover"
        onConfirm={onDeleteComp}
        onCancel={() => setDeleteComp(null)}
        variant="danger"
      />
    </div>
  )
}

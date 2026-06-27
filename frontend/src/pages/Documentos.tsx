import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, FileText, Upload, BookOpen, ScrollText, ClipboardList, GraduationCap, File, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { parsePdf } from '../lib/pdfParser'

interface Documento {
  id: number
  titulo: string
  descricao: string | null
  tipo: string
  arquivo_nome: string
  mime_type: string
  ativo: boolean
  created_at: string
  conteudo_estruturado?: {
    topicos: { titulo: string; conteudo: string; subtopicos?: { titulo: string; conteudo: string }[] }[]
    total_paginas: number
  } | null
}

const TIPOS = [
  { value: 'ordo',     label: 'Ordo',     icon: BookOpen      },
  { value: 'roteiro',  label: 'Roteiro',  icon: ScrollText    },
  { value: 'norma',    label: 'Norma',    icon: ClipboardList },
  { value: 'formacao', label: 'Formação', icon: GraduationCap },
  { value: 'outro',    label: 'Outro',    icon: File          },
]

export default function AdminDocumentos() {
  const [lista, setLista]       = useState<Documento[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [lendo, setLendo]       = useState<Documento | null>(null)
  const fileRef                 = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    titulo: '', descricao: '', tipo: 'outro',
    arquivo_nome: '', arquivo_base64: '', mime_type: 'application/pdf',
    conteudo_estruturado: null as any,
  })

  const carregar = () => {
    setLoading(true)
    api.get<Documento[]>('/documentos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const base64: string = await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = ev => res(ev.target?.result as string)
      reader.onerror = rej
      reader.readAsDataURL(file)
    })

    let conteudo_estruturado = null
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      toast.loading('Lendo e estruturando o PDF...', { id: 'pdf-parse' })
      try {
        conteudo_estruturado = await parsePdf(base64)
        toast.success(`${conteudo_estruturado.topicos.length} tópicos detectados!`, { id: 'pdf-parse' })
      } catch (err) {
        console.error(err)
        toast.error('Erro ao processar PDF', { id: 'pdf-parse' })
      }
    }

    setForm(f => ({
      ...f,
      arquivo_nome: file.name,
      mime_type: file.type || 'application/pdf',
      arquivo_base64: base64,
      conteudo_estruturado,
    }))
  }

  async function handleSalvar() {
    if (!form.titulo || !form.arquivo_base64) return toast.error('Preencha título e selecione um arquivo')
    setSalvando(true)
    try {
      await api.post('/documentos', form)
      toast.success('Documento adicionado!')
      setForm({
        titulo: '', descricao: '', tipo: 'outro',
        arquivo_nome: '', arquivo_base64: '', mime_type: 'application/pdf',
        conteudo_estruturado: null,
      })
      setShowForm(false)
      carregar()
    } catch { toast.error('Erro ao salvar') }
    finally { setSalvando(false) }
  }

  async function handleDeletar(id: number) {
    if (!confirm('Remover este documento?')) return
    try {
      await api.delete(`/documentos/${id}`)
      toast.success('Removido.')
      setLista(l => l.filter(d => d.id !== id))
    } catch { toast.error('Erro ao remover') }
  }

  if (lendo) {
    return <LivroReader doc={lendo} onClose={() => setLendo(null)} />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={22} className="text-amber-500" /> Documentos
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Materiais disponíveis no portal do membro</p>
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Novo Documento</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input className="input-field" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} maxLength={255} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input-field" value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Arquivo (PDF, DOC, etc)</label>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="input-field text-left flex items-center gap-2 text-gray-500 cursor-pointer w-full">
                <Upload size={14} />
                {form.arquivo_nome || 'Selecionar arquivo...'}
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={handleFile} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição (opcional)</label>
              <textarea className="input-field" rows={2} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSalvar} disabled={salvando} className="btn-primary disabled:opacity-60">
              {salvando ? 'Salvando...' : 'Salvar Documento'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
        </div>
      ) : !lista.length ? (
        <div className="card p-12 text-center">
          <FileText size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">Nenhum documento cadastrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {lista.map(doc => {
              const tipoCfg = TIPOS.find(t => t.value === doc.tipo) ?? TIPOS[4]
              const Icon = tipoCfg.icon
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.titulo}</p>
                    <p className="text-xs text-gray-400">
                      {tipoCfg.label} · {doc.arquivo_nome}
                      {doc.conteudo_estruturado && ` · ${doc.conteudo_estruturado.topicos.length} tópicos`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.conteudo_estruturado && (
                      <button
                        onClick={() => setLendo(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-amber-50 text-amber-600 active:scale-95"
                      >
                        <BookOpen size={13} /> Ler
                      </button>
                    )}
                    <button onClick={() => handleDeletar(doc.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function LivroReader({ doc, onClose }: { doc: Documento; onClose: () => void }) {
  const topicos = doc.conteudo_estruturado?.topicos ?? []
  const GOLD = '#fbbf24'
  const WINE = '#7c2d3e'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10 flex-shrink-0" style={{ background: '#1a1a1a' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${WINE}30` }}>
          <BookOpen size={17} style={{ color: GOLD }} />
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
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-white/10 py-4 hidden md:block" style={{ background: '#141414' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-5 mb-3">Índice</p>
          {topicos.map((t, i) => (
            <div key={i} className="mb-2">
              <a
                href={`#topico-${i}`}
                className="block w-full text-left px-5 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors font-bold"
              >
                <span className="text-amber-500/65 mr-2">{String(i + 1).padStart(2, '0')}</span>
                {t.titulo}
              </a>
              {t.subtopicos && t.subtopicos.length > 0 && (
                <div className="pl-4 mt-0.5 space-y-0.5 border-l border-white/5 ml-7">
                  {t.subtopicos.map((st, j) => (
                    <a
                      key={j}
                      href={`#topico-${i}-${j}`}
                      className="block w-full text-left py-1 text-[11px] text-white/45 hover:text-white/80 transition-colors"
                    >
                      <span className="text-white/25 mr-1.5">{i + 1}.{j + 1}</span>
                      {st.titulo.replace(/^\d+(\.\d+)*\s*[\.\-–—]?\s*/, '')}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {topicos.length === 0 ? (
              <div className="text-center text-white/30 mt-20">
                <BookOpen size={40} className="mx-auto mb-3" />
                <p>Nenhum conteúdo disponível</p>
              </div>
            ) : (
              topicos.map((t, i) => (
                <div key={i} id={`topico-${i}`} className="mb-14 scroll-mt-20">
                  {/* Tópico Principal */}
                  <div className="flex items-baseline gap-3 mb-4 border-b border-white/5 pb-2">
                    <span className="text-sm font-mono text-amber-500/80 font-bold">{String(i + 1).padStart(2, '0')}</span>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">{t.titulo}</h2>
                  </div>
                  
                  {t.conteudo && (
                    <p className="text-white/80 text-sm leading-[1.85] whitespace-pre-wrap mb-8">{t.conteudo}</p>
                  )}
                  
                  {/* Subtópicos */}
                  {t.subtopicos && t.subtopicos.length > 0 && (
                    <div className="mt-8 pl-4 border-l-2 border-amber-500/20 space-y-10">
                      {t.subtopicos.map((st, j) => (
                        <div key={j} id={`topico-${i}-${j}`} className="scroll-mt-20">
                          <div className="flex items-baseline gap-2.5 mb-3">
                            <span className="text-xs font-mono text-amber-500/50">{i + 1}.{j + 1}</span>
                            <h3 className="text-lg font-bold text-white tracking-tight">{st.titulo}</h3>
                          </div>
                          {st.conteudo ? (
                            <p className="text-white/70 text-sm leading-[1.8] whitespace-pre-wrap">{st.conteudo}</p>
                          ) : (
                            <p className="text-white/30 text-sm italic">Sem conteúdo</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {i < topicos.length - 1 && <div className="mt-14 border-t border-white/5" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

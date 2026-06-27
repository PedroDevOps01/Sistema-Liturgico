import { useEffect, useState } from 'react'
import { FileText, Download, BookOpen, ScrollText, ClipboardList, GraduationCap, File, X } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const WINE = '#7c2d3e'

interface Topico { titulo: string; conteudo: string; subtopicos?: Topico[] }
interface ConteudoEstruturado { topicos: Topico[]; total_paginas: number }

interface Documento {
  id: number
  titulo: string
  descricao: string | null
  tipo: string
  arquivo_nome: string
  mime_type: string
  created_at: string
  conteudo_estruturado?: ConteudoEstruturado | null
}

const TIPO_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ordo:     { label: 'Ordo',     icon: BookOpen,     color: '#7C3AED', bg: '#7C3AED15' },
  roteiro:  { label: 'Roteiro',  icon: ScrollText,   color: '#0EA5E9', bg: '#0EA5E915' },
  norma:    { label: 'Norma',    icon: ClipboardList, color: '#EF4444', bg: '#EF444415' },
  formacao: { label: 'Formação', icon: GraduationCap, color: '#10B981', bg: '#10B98115' },
  outro:    { label: 'Outro',    icon: File,          color: '#6B7280', bg: '#6B728015' },
}

async function handleDownload(doc: Documento) {
  try {
    toast.loading('Preparando download...', { id: 'dl' })
    const r = await membroApi.get(`/documentos/${doc.id}/download`)
    const payload = (r.data as Record<string, string>)
    const base64 = payload.arquivo_base64 ?? ''
    const mime = payload.mime_type ?? doc.mime_type
    const nome = payload.arquivo_nome ?? doc.arquivo_nome
    const raw = base64.replace(/^data:[^;]+;base64,/, '')
    const byteStr = atob(raw)
    const ab = new ArrayBuffer(byteStr.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
    const blob = new Blob([ab], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nome; a.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado!', { id: 'dl' })
  } catch {
    toast.error('Erro ao baixar documento', { id: 'dl' })
  }
}

// ── Leitor fullscreen ──────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

export default function MembroDocumentos() {
  const [lista, setLista]           = useState<Documento[]>([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('todos')
  const [lendo, setLendo]           = useState<Documento | null>(null)

  useEffect(() => {
    membroApi.get<Documento[]>('/documentos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  const tipos = ['todos', ...Array.from(new Set(lista.map(d => d.tipo)))]
  const filtrada = filtro === 'todos' ? lista : lista.filter(d => d.tipo === filtro)
  const grupos = filtrada.reduce<Record<string, Documento[]>>((acc, d) => {
    if (!acc[d.tipo]) acc[d.tipo] = []
    acc[d.tipo].push(d)
    return acc
  }, {})

  if (lendo) return <LivroReader doc={lendo} onClose={() => setLendo(null)} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={22} style={{ color: GOLD }} /> Documentos
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Materiais e documentos do ministério</p>
      </div>

      {tipos.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {tipos.map(t => {
            const cfg = t !== 'todos' ? TIPO_CFG[t] : null
            const ativo = filtro === t
            return (
              <button key={t} onClick={() => setFiltro(t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={ativo ? { background: cfg?.color ?? WINE, color: 'white' } : { background: '#F3F4F6', color: '#6B7280' }}>
                {t === 'todos' ? 'Todos' : TIPO_CFG[t]?.label ?? t}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
        </div>
      ) : !lista.length ? (
        <div className="card p-14 text-center">
          <FileText size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Nenhum documento disponível</p>
          <p className="text-sm text-gray-400 mt-1">Os documentos do ministério serão publicados aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([tipo, docs]) => {
            const cfg = TIPO_CFG[tipo] ?? TIPO_CFG.outro
            const Icon = cfg.icon
            return (
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                    <Icon size={13} style={{ color: cfg.color }} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: cfg.color }}>
                    {cfg.label}
                  </p>
                </div>
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="card flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{doc.titulo}</p>
                        {doc.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.descricao}</p>}
                        {doc.conteudo_estruturado && (
                          <p className="text-[10px] text-gray-300 mt-0.5">
                            {doc.conteudo_estruturado.topicos.length} tópicos · {doc.conteudo_estruturado.total_paginas} páginas
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.conteudo_estruturado && (
                          <button
                            onClick={() => setLendo(doc)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            style={{ background: `${WINE}15`, color: WINE }}
                          >
                            <BookOpen size={13} /> Ler
                          </button>
                        )}
                        <button onClick={() => handleDownload(doc)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
                          style={{ background: `${GOLD}20`, color: '#f59e0b' }}>
                          <Download size={13} /> Baixar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


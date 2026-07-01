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
  ordo:     { label: 'Ordo',      icon: BookOpen,      color: '#7C3AED', bg: '#7C3AED15' },
  roteiro:  { label: 'Roteiro',   icon: ScrollText,    color: '#0EA5E9', bg: '#0EA5E915' },
  norma:    { label: 'Norma',     icon: ClipboardList, color: '#EF4444', bg: '#EF444415' },
  formacao: { label: 'Formação',  icon: GraduationCap, color: '#10B981', bg: '#10B98115' },
  outro:    { label: 'Outro',     icon: File,          color: '#6B7280', bg: '#6B728015' },
}

function ehPdf(doc: Documento) {
  return doc.mime_type.includes('pdf') || doc.arquivo_nome.toLowerCase().endsWith('.pdf')
}

async function handleDownload(doc: Documento) {
  try {
    toast.loading('Preparando download...', { id: 'dl' })
    const r = await membroApi.get(`/documentos/${doc.id}/download`)
    const payload = (r.data as Record<string, string>)
    const base64 = payload.arquivo_base64 ?? ''
    const mime   = payload.mime_type    ?? doc.mime_type
    const nome   = payload.arquivo_nome ?? doc.arquivo_nome
    const raw    = base64.replace(/^data:[^;]+;base64,/, '')
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

// Renderiza PDF página a página como imagens (inclui imagens do PDF)
async function renderPdfToImages(base64: string): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const raw    = base64.replace(/^data:[^;]+;base64,/, '')
  const binary = atob(raw)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (pdfjsLib as any).getDocument({ data: bytes }).promise
  const pages: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page     = await pdf.getPage(p)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas   = document.createElement('canvas')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    const ctx = canvas.getContext('2d')!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport }).promise
    pages.push(canvas.toDataURL('image/jpeg', 0.88))
  }
  return pages
}

// ── ContentRenderer: divide o texto em parágrafos legíveis ────────────────
function ContentRenderer({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.split('\n').map(l => l.trim()).filter(Boolean).join(' '))
    .filter(Boolean)

  if (!paragraphs.length) return null

  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-white/70 text-sm leading-[1.85]">{para}</p>
      ))}
    </div>
  )
}

// ── PdfViewer: baixa e renderiza cada página do PDF (com imagens) ─────────
function PdfViewer({ docId }: { docId: number }) {
  const [pages,   setPages]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await membroApi.get<Record<string, string>>(`/documentos/${docId}/download`)
        if (cancelled) return
        const base64 = r.data.arquivo_base64 ?? ''
        const imgs   = await renderPdfToImages(base64)
        if (!cancelled) { setPages(imgs); setLoading(false) }
      } catch {
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [docId])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div
        className="w-8 h-8 rounded-full border-4 animate-spin"
        style={{ borderColor: 'rgba(251,191,36,0.2)', borderTopColor: GOLD }}
      />
      <p className="text-white/40 text-sm">Carregando páginas do PDF…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
      <FileText size={36} />
      <p className="text-sm">Não foi possível carregar o PDF</p>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      {pages.map((page, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden shadow-xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <img src={page} alt={`Página ${i + 1}`} className="w-full block" />
          {pages.length > 1 && (
            <div className="flex justify-center py-2" style={{ background: '#1a1a1a' }}>
              <span className="text-[10px] text-white/20 font-mono tracking-widest">
                {i + 1} / {pages.length}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Extrai o número real da seção a partir do título (ex: "5 - Da formação" → "05", "5.1- Formação" → "5.1")
function getSectionNum(titulo: string): string | null {
  const m1 = titulo.match(/^(\d+)\s*[-–—]/)
  if (m1) return m1[1].padStart(2, '0')
  const m2 = titulo.match(/^(\d+\.\d+)/)
  if (m2) return m2[1]
  return null
}

// ── LivroReader fullscreen ─────────────────────────────────────────────────
function LivroReader({ doc, onClose }: { doc: Documento; onClose: () => void }) {
  const topicos  = doc.conteudo_estruturado?.topicos ?? []
  const hasTexto = topicos.length > 0
  const [mode, setMode] = useState<'texto' | 'pdf'>('pdf')

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0f0f0f' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center gap-4 px-6 py-4 border-b border-white/10 flex-shrink-0"
        style={{ background: '#1a1a1a' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${WINE}30` }}
        >
          <BookOpen size={17} style={{ color: GOLD }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{doc.titulo}</p>
          {doc.descricao && <p className="text-xs text-white/40 truncate">{doc.descricao}</p>}
        </div>

        {/* Toggle Texto / PDF (só quando tem os dois) */}
        {hasTexto && ehPdf(doc) && (
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ background: '#222' }}
          >
            {(['texto', 'pdf'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={
                  mode === m
                    ? { background: 'rgba(251,191,36,0.15)', color: GOLD }
                    : { color: 'rgba(255,255,255,0.3)' }
                }
              >
                {m === 'texto' ? 'Texto' : 'PDF'}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Conteúdo ── */}
      {mode === 'pdf' ? (
        <div className="flex-1 overflow-y-auto">
          <PdfViewer docId={doc.id} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar índice */}
          <div
            className="w-72 flex-shrink-0 overflow-y-auto border-r border-white/10 py-4 hidden md:block"
            style={{ background: '#141414' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-5 mb-3">
              Índice
            </p>
            {topicos.map((t, i) => (
              <div key={i} className="mb-2">
                <a
                  href={`#topico-${i}`}
                  className="block w-full text-left px-5 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors font-bold"
                >
                  <span className="text-amber-500/65 mr-2">{getSectionNum(t.titulo) ?? String(i + 1).padStart(2, '0')}</span>
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
                        <span className="text-white/25 mr-1.5">{getSectionNum(st.titulo) ?? `${i + 1}.${j + 1}`}</span>
                        {st.titulo.replace(/^\d+(\.\d+)*\s*[\.\-–—]?\s*/, '')}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Texto principal */}
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

                    {/* Título principal */}
                    <div className="flex items-baseline gap-3 mb-5 border-b border-white/5 pb-3">
                      <span className="text-sm font-mono text-amber-500/80 font-bold flex-shrink-0">
                        {getSectionNum(t.titulo) ?? String(i + 1).padStart(2, '0')}
                      </span>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">{t.titulo}</h2>
                    </div>

                    {t.conteudo && (
                      <div className="mb-8">
                        <ContentRenderer content={t.conteudo} />
                      </div>
                    )}

                    {/* Subtópicos */}
                    {t.subtopicos && t.subtopicos.length > 0 && (
                      <div className="mt-6 pl-5 border-l-2 border-amber-500/20 space-y-10">
                        {t.subtopicos.map((st, j) => (
                          <div key={j} id={`topico-${i}-${j}`} className="scroll-mt-20">
                            <div className="flex items-baseline gap-2.5 mb-4">
                              <span className="text-xs font-mono text-amber-500/50 flex-shrink-0">
                                {getSectionNum(st.titulo) ?? `${i + 1}.${j + 1}`}
                              </span>
                              <h3 className="text-lg font-bold text-white tracking-tight">{st.titulo}</h3>
                            </div>
                            {st.conteudo ? (
                              <ContentRenderer content={st.conteudo} />
                            ) : (
                              <p className="text-white/30 text-sm italic">Sem conteúdo</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {i < topicos.length - 1 && (
                      <div className="mt-14 border-t border-white/5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────
export default function MembroDocumentos() {
  const [lista,   setLista]   = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('todos')
  const [lendo,   setLendo]   = useState<Documento | null>(null)

  useEffect(() => {
    membroApi.get<Documento[]>('/documentos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  const tipos    = ['todos', ...Array.from(new Set(lista.map(d => d.tipo)))]
  const filtrada = filtro === 'todos' ? lista : lista.filter(d => d.tipo === filtro)
  const grupos   = filtrada.reduce<Record<string, Documento[]>>((acc, d) => {
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
            const cfg  = t !== 'todos' ? TIPO_CFG[t] : null
            const ativo = filtro === t
            return (
              <button
                key={t}
                onClick={() => setFiltro(t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={
                  ativo
                    ? { background: cfg?.color ?? WINE, color: 'white' }
                    : { background: '#F3F4F6', color: '#6B7280' }
                }
              >
                {t === 'todos' ? 'Todos' : TIPO_CFG[t]?.label ?? t}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }}
          />
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
            const cfg  = TIPO_CFG[tipo] ?? TIPO_CFG.outro
            const Icon = cfg.icon
            return (
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={13} style={{ color: cfg.color }} />
                  </div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </p>
                </div>

                <div className="space-y-2">
                  {docs.map(doc => {
                    const podeVer = !!doc.conteudo_estruturado || ehPdf(doc)
                    return (
                      <div key={doc.id} className="card flex items-center gap-4 p-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg }}
                        >
                          <Icon size={18} style={{ color: cfg.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{doc.titulo}</p>
                          {doc.descricao && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.descricao}</p>
                          )}
                          {doc.conteudo_estruturado && (
                            <p className="text-[10px] text-gray-300 mt-0.5">
                              {doc.conteudo_estruturado.topicos.length} tópicos
                              {' · '}
                              {doc.conteudo_estruturado.total_paginas} páginas
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {podeVer && (
                            <button
                              onClick={() => setLendo(doc)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{ background: `${WINE}15`, color: WINE }}
                            >
                              <BookOpen size={13} />
                              Ver
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
                            style={{ background: `${GOLD}20`, color: '#f59e0b' }}
                          >
                            <Download size={13} /> Baixar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

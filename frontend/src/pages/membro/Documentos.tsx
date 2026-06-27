import { useEffect, useState } from 'react'
import { FileText, Download, BookOpen, ScrollText, ClipboardList, GraduationCap, File } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'

interface Documento {
  id: number
  titulo: string
  descricao: string | null
  tipo: string
  arquivo_nome: string
  mime_type: string
  created_at: string
}

const TIPO_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ordo:     { label: 'Ordo',     icon: BookOpen,      color: '#7C3AED', bg: '#7C3AED15' },
  roteiro:  { label: 'Roteiro',  icon: ScrollText,    color: '#0EA5E9', bg: '#0EA5E915' },
  norma:    { label: 'Norma',    icon: ClipboardList, color: '#EF4444', bg: '#EF444415' },
  formacao: { label: 'Formação', icon: GraduationCap, color: '#10B981', bg: '#10B98115' },
  outro:    { label: 'Outro',    icon: File,          color: '#6B7280', bg: '#6B728015' },
}

async function handleDownload(doc: Documento) {
  try {
    toast.loading('Preparando download...', { id: 'dl' })
    const r = await membroApi.get(`/documentos/${doc.id}/download`)
    const payload = (r.data as Record<string, string>)
    const base64  = payload.arquivo_base64 ?? ''
    const mime    = payload.mime_type ?? doc.mime_type
    const nome    = payload.arquivo_nome ?? doc.arquivo_nome
    const raw     = base64.replace(/^data:[^;]+;base64,/, '')
    const byteStr = atob(raw)
    const ab      = new ArrayBuffer(byteStr.length)
    const ia      = new Uint8Array(ab)
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
    const blob = new Blob([ab], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = nome; a.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado!', { id: 'dl' })
  } catch {
    toast.error('Erro ao baixar documento', { id: 'dl' })
  }
}

export default function MembroDocumentos() {
  const [lista, setLista]     = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('todos')

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
              <button key={t} onClick={() => setFiltro(t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={ativo ? { background: cfg?.color ?? '#431407', color: 'white' } : { background: '#F3F4F6', color: '#6B7280' }}>
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
            const cfg  = TIPO_CFG[tipo] ?? TIPO_CFG.outro
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
                        <p className="text-[10px] text-gray-300 mt-0.5">{doc.arquivo_nome}</p>
                      </div>
                      <button onClick={() => handleDownload(doc)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
                        style={{ background: `${GOLD}20`, color: '#92400e' }}>
                        <Download size={13} /> Baixar
                      </button>
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

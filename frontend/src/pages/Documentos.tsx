import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, FileText, Upload, BookOpen, ScrollText, ClipboardList, GraduationCap, File } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

interface Documento {
  id: number
  titulo: string
  descricao: string | null
  tipo: string
  arquivo_nome: string
  mime_type: string
  ativo: boolean
  created_at: string
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
  const fileRef                 = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    titulo: '', descricao: '', tipo: 'outro',
    arquivo_nome: '', arquivo_base64: '', mime_type: 'application/pdf',
  })

  const carregar = () => {
    setLoading(true)
    api.get<Documento[]>('/documentos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setForm(f => ({
        ...f,
        arquivo_nome: file.name,
        mime_type: file.type || 'application/pdf',
        arquivo_base64: ev.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSalvar() {
    if (!form.titulo || !form.arquivo_base64) return toast.error('Preencha título e selecione um arquivo')
    setSalvando(true)
    try {
      await api.post('/documentos', form)
      toast.success('Documento adicionado!')
      setForm({ titulo: '', descricao: '', tipo: 'outro', arquivo_nome: '', arquivo_base64: '', mime_type: 'application/pdf' })
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
                    <p className="text-xs text-gray-400">{tipoCfg.label} · {doc.arquivo_nome}</p>
                  </div>
                  <button onClick={() => handleDeletar(doc.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Search, Wifi, WifiOff, Send, Info, Calendar, Clock, Gift, Users, GraduationCap, Repeat, CalendarX } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Cerimoniario } from '../types'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { SkeletonRow } from '../components/common/LoadingSpinner'

interface Comunicado {
  id: number
  titulo: string
  corpo: string
  tipo: 'info' | 'aviso' | 'urgente'
  categoria: string
  canal: 'portal' | 'whatsapp'
  ativo: boolean
  cerimoniario_id: number | null
  cerimoniario?: { id: number; nome: string } | null
  created_at: string
}

type DestinatarioTipo = 'todos' | 'individual' | 'perfil'

interface FormState {
  titulo: string
  corpo: string
  tipo: 'info' | 'aviso' | 'urgente'
  destinatario_tipo: DestinatarioTipo
  cerimoniario_ids: number[]
  perfil: 'experiente' | 'mestre'
  canal: 'portal' | 'whatsapp' | 'ambos'
}

function defaultForm(): FormState {
  return {
    titulo: '', corpo: '', tipo: 'info',
    destinatario_tipo: 'todos', cerimoniario_ids: [], perfil: 'experiente', canal: 'portal',
  }
}

const TIPO_BADGE: Record<Comunicado['tipo'], 'blue' | 'gold' | 'red'> = {
  info: 'blue', aviso: 'gold', urgente: 'red',
}

export default function Comunicados() {
  const [list, setList] = useState<Comunicado[]>([])
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Comunicado | null>(null)
  const [cerSearch, setCerSearch] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState<{ conectado: boolean; detalhe: string } | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<Comunicado[]>('/comunicados')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar comunicados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
    api.get<Cerimoniario[]>('/cerimoniarios').then(r => setCerimoniarios(r.data.filter(c => c.ativo))).catch(() => null)
    api.get<{ conectado: boolean; detalhe: string }>('/whatsapp/status').then(r => setWhatsappStatus(r.data)).catch(() => null)
  }, [loadList])

  function openNew() {
    setForm(defaultForm())
    setModalOpen(true)
  }

  function toggleCerimoniario(id: number) {
    setForm(f => ({
      ...f,
      cerimoniario_ids: f.cerimoniario_ids.includes(id)
        ? f.cerimoniario_ids.filter(x => x !== id)
        : [...f.cerimoniario_ids, id],
    }))
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.corpo.trim()) {
      toast.error('Preencha título e corpo do comunicado')
      return
    }
    if (form.destinatario_tipo === 'individual' && form.cerimoniario_ids.length === 0) {
      toast.error('Selecione ao menos um cerimoniário')
      return
    }

    setSaving(true)
    try {
      await api.post('/comunicados', {
        titulo: form.titulo,
        corpo: form.corpo,
        tipo: form.tipo,
        destinatario_tipo: form.destinatario_tipo,
        cerimoniario_ids: form.destinatario_tipo === 'individual' ? form.cerimoniario_ids : undefined,
        perfil: form.destinatario_tipo === 'perfil' ? form.perfil : undefined,
        canal: form.canal,
      })
      toast.success('Comunicado enviado!')
      setModalOpen(false)
      loadList()
    } catch {
      toast.error('Erro ao enviar comunicado')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtivo(c: Comunicado) {
    try {
      await api.put(`/comunicados/${c.id}`, { ativo: !c.ativo })
      loadList()
    } catch {
      toast.error('Erro ao atualizar comunicado')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/comunicados/${deleteTarget.id}`)
      toast.success('Comunicado removido')
      setDeleteTarget(null)
      loadList()
    } catch {
      toast.error('Erro ao remover comunicado')
    }
  }

  const cerFiltrados = cerimoniarios.filter(c =>
    !cerSearch || c.nome.toLowerCase().includes(cerSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        subtitle={`${list.length} comunicados gerais`}
        action={
          <div className="flex items-center gap-3">
            {whatsappStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  whatsappStatus.conectado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
                title={whatsappStatus.detalhe}
              >
                {whatsappStatus.conectado ? <Wifi size={13} /> : <WifiOff size={13} />}
                {whatsappStatus.conectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
              </span>
            )}
            <button onClick={openNew} className="btn-primary">
              <Plus size={18} /> Novo Comunicado
            </button>
          </div>
        }
      />

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-wine-600" />
          <h2 className="font-bold text-gray-800 text-sm">Como funciona a comunicação automática</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Automáticos aos cerimoniários</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2"><Calendar size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Escala publicada</li>
              <li className="flex items-start gap-2"><Clock size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Lembrete de escala 24h antes</li>
              <li className="flex items-start gap-2"><Clock size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Lembrete de escala no dia</li>
              <li className="flex items-start gap-2"><Gift size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Aniversário (mensagem de parabéns)</li>
              <li className="flex items-start gap-2"><Users size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Convite de reunião (só convidados)</li>
              <li className="flex items-start gap-2"><GraduationCap size={14} className="mt-0.5 text-wine-500 flex-shrink-0" /> Convite de treinamento (só participantes)</li>
            </ul>
            <p className="text-[11px] text-gray-400">Sempre por WhatsApp — e aparecem na aba Comunicados do Portal do Membro da pessoa.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Manual — Comunicado Geral</p>
            <p className="text-sm text-gray-600">
              É o que esta tela faz: escreva um aviso e escolha o destinatário (todos, pessoas específicas ou por
              perfil) e o canal (Portal do Membro ou WhatsApp).
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Automáticos para você (admin)</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2"><Repeat size={14} className="mt-0.5 text-amber-600 flex-shrink-0" /> Solicitação de troca de escala (pedido de substituto)</li>
              <li className="flex items-start gap-2"><CalendarX size={14} className="mt-0.5 text-amber-600 flex-shrink-0" /> Solicitação de indisponibilidade ("não posso servir neste dia")</li>
              <li className="flex items-start gap-2"><CalendarX size={14} className="mt-0.5 text-amber-600 flex-shrink-0" /> Solicitação de bloqueio de período</li>
            </ul>
            <p className="text-[11px] text-gray-400">
              Por e-mail (configure o destinatário em Configurações) — não aparecem nessa lista nem no Portal do
              Membro. As duas últimas usam a mesma funcionalidade de bloqueio de datas do cerimoniário.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Destinatário</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ativo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <>
                <SkeletonRow cols={7} />
                <SkeletonRow cols={7} />
                <SkeletonRow cols={7} />
              </>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhum comunicado criado ainda.
                </td>
              </tr>
            ) : (
              list.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{c.titulo}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{c.corpo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.cerimoniario ? c.cerimoniario.nome : 'Todos'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TIPO_BADGE[c.tipo]} size="sm">{c.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.canal === 'whatsapp' ? 'green' : 'purple'} size="sm">
                      {c.canal === 'whatsapp' ? 'WhatsApp' : 'Portal'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleAtivo(c)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Comunicado"
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Send size={15} /> {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              className="input-field"
              placeholder="Ex: Missa de Domingo transferida"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              value={form.corpo}
              onChange={e => setForm(f => ({ ...f, corpo: e.target.value }))}
              className="input-field min-h-[100px]"
              placeholder="Escreva o comunicado..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as FormState['tipo'] }))}
                className="input-field"
              >
                <option value="info">Informação</option>
                <option value="aviso">Aviso</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
              <select
                value={form.canal}
                onChange={e => setForm(f => ({ ...f, canal: e.target.value as FormState['canal'] }))}
                className="input-field"
              >
                <option value="portal">Só Portal do Membro</option>
                <option value="whatsapp">Só WhatsApp</option>
                <option value="ambos">Portal + WhatsApp</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destinatário</label>
            <div className="flex gap-2 mb-3">
              {(['todos', 'individual', 'perfil'] as DestinatarioTipo[]).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, destinatario_tipo: opt }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    form.destinatario_tipo === opt
                      ? 'border-wine-600 bg-wine-50 text-wine-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt === 'todos' ? 'Todos' : opt === 'individual' ? 'Pessoas específicas' : 'Por perfil'}
                </button>
              ))}
            </div>

            {form.destinatario_tipo === 'individual' && (
              <div>
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
                    const selected = form.cerimoniario_ids.includes(c.id)
                    return (
                      <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-wine-50' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCerimoniario(c.id)}
                          className="rounded border-wine-300 text-wine-700 focus:ring-wine-500"
                        />
                        <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {form.destinatario_tipo === 'perfil' && (
              <select
                value={form.perfil}
                onChange={e => setForm(f => ({ ...f, perfil: e.target.value as FormState['perfil'] }))}
                className="input-field"
              >
                <option value="experiente">Experientes</option>
                <option value="mestre">Mestres</option>
              </select>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover Comunicado"
        message={`Remover o comunicado "${deleteTarget?.titulo}"?`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

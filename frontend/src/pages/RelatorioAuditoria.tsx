import React, { useState } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ShieldCheck, ChevronDown, ChevronUp, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditoriaItem {
  id: number
  tabela: string
  operacao: 'criou' | 'atualizou' | 'excluiu'
  registro_id: number | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  usuario_id: number | null
  usuario_nome: string | null
  ip: string | null
  created_at: string
}

interface AuditoriaPaginada {
  data: AuditoriaItem[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABELAS_LABELS: Record<string, string> = {
  cerimoniarios:             'Cerimoniários',
  celebracoes:               'Celebrações',
  escalas:                   'Escalas',
  escala_itens:              'Itens de Escala',
  presencas:                 'Presenças',
  treinamentos:              'Treinamentos',
  treinamento_presencas:     'Presenças em Treinamentos',
  treinamento_competencias:  'Competências de Treinamentos',
  tunicas:                   'Túnicas',
  tunica_emprestimos:        'Empréstimos de Túnicas',
  formacao_niveis:           'Níveis de Formação',
  formacao_competencias:     'Competências de Formação',
  cerimoniario_competencias: 'Progresso de Formação',
  users:                     'Usuários',
  interessados:              'Interessados',
}

const META_FIELDS = new Set(['created_at', 'updated_at', 'deleted_at', 'remember_token', 'password'])

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function toComparable(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function operacaoBadge(operacao: AuditoriaItem['operacao']) {
  if (operacao === 'criou')    return <Badge variant="green" size="sm">Criou</Badge>
  if (operacao === 'atualizou') return <Badge variant="blue" size="sm">Atualizou</Badge>
  if (operacao === 'excluiu')  return <Badge variant="red" size="sm">Excluiu</Badge>
  return <Badge variant="gray" size="sm">{operacao}</Badge>
}

// ─── Diff Component ───────────────────────────────────────────────────────────

function DiffView({ item }: { item: AuditoriaItem }) {
  if (item.operacao === 'criou' && item.dados_depois) {
    const entries = Object.entries(item.dados_depois).filter(([k]) => !META_FIELDS.has(k))
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-green-50">
              <th className="text-left px-3 py-2 font-semibold text-green-800 w-40">Campo</th>
              <th className="text-left px-3 py-2 font-semibold text-green-800">Valor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className="bg-green-50/60 border-t border-green-100">
                <td className="px-3 py-1.5 font-mono text-green-900 font-medium">{key}</td>
                <td className="px-3 py-1.5 text-green-800 break-all">{formatVal(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (item.operacao === 'excluiu' && item.dados_antes) {
    const entries = Object.entries(item.dados_antes).filter(([k]) => !META_FIELDS.has(k))
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-red-50">
              <th className="text-left px-3 py-2 font-semibold text-red-800 w-40">Campo</th>
              <th className="text-left px-3 py-2 font-semibold text-red-800">Valor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className="bg-red-50/60 border-t border-red-100">
                <td className="px-3 py-1.5 font-mono text-red-900 font-medium">{key}</td>
                <td className="px-3 py-1.5 text-red-800 break-all">{formatVal(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (item.operacao === 'atualizou' && item.dados_antes && item.dados_depois) {
    const allKeys = Array.from(
      new Set([
        ...Object.keys(item.dados_antes),
        ...Object.keys(item.dados_depois),
      ])
    ).filter(k => !META_FIELDS.has(k))

    const changed = allKeys.filter(k =>
      toComparable(item.dados_antes![k]) !== toComparable(item.dados_depois![k])
    )
    const unchanged = allKeys.filter(k =>
      toComparable(item.dados_antes![k]) === toComparable(item.dados_depois![k])
    )

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-amber-50">
              <th className="text-left px-3 py-2 font-semibold text-amber-800 w-36">Campo</th>
              <th className="text-left px-3 py-2 font-semibold text-amber-800">Antes</th>
              <th className="text-left px-3 py-2 font-semibold text-amber-800">Depois</th>
            </tr>
          </thead>
          <tbody>
            {changed.map(key => (
              <tr key={key} className="bg-amber-50/70 border-t border-amber-100">
                <td className="px-3 py-1.5 font-mono text-amber-900 font-semibold">{key}</td>
                <td className="px-3 py-1.5 text-red-700 break-all line-through opacity-70">
                  {formatVal(item.dados_antes![key])}
                </td>
                <td className="px-3 py-1.5 text-green-700 break-all font-medium">
                  {formatVal(item.dados_depois![key])}
                </td>
              </tr>
            ))}
            {unchanged.map(key => (
              <tr key={key} className="bg-gray-50/50 border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-gray-500">{key}</td>
                <td className="px-3 py-1.5 text-gray-400 break-all">
                  {formatVal(item.dados_antes![key])}
                </td>
                <td className="px-3 py-1.5 text-gray-400 break-all">
                  {formatVal(item.dados_depois![key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <p className="text-xs text-gray-400 px-3 py-2">Sem dados disponíveis para este registro.</p>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RelatorioAuditoria() {
  const today = new Date()
  const [de, setDe] = useState(format(subDays(today, 30), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(today, 'yyyy-MM-dd'))
  const [tabela, setTabela] = useState('')
  const [operacao, setOperacao] = useState('')
  const [resultado, setResultado] = useState<AuditoriaPaginada | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  async function buscar(p = 1) {
    setLoading(true)
    setExpandedIds(new Set())
    try {
      const params = new URLSearchParams({ de, ate, page: String(p) })
      if (tabela)   params.set('tabela', tabela)
      if (operacao) params.set('operacao', operacao)
      const r = await api.get<AuditoriaPaginada>(`/auditorias?${params.toString()}`)
      setResultado(r.data)
      setPage(p)
    } catch {
      toast.error('Erro ao buscar registros de auditoria')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria do Sistema"
        subtitle="Histórico de criações, atualizações e exclusões registradas no sistema"
      />

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">De</label>
            <input
              type="date"
              value={de}
              onChange={e => setDe(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Até</label>
            <input
              type="date"
              value={ate}
              onChange={e => setAte(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Tabela</label>
            <select
              value={tabela}
              onChange={e => setTabela(e.target.value)}
              className="input-field"
            >
              <option value="">Todas as tabelas</option>
              {Object.entries(TABELAS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Operação</label>
            <select
              value={operacao}
              onChange={e => setOperacao(e.target.value)}
              className="input-field"
            >
              <option value="">Todas</option>
              <option value="criou">Criou</option>
              <option value="atualizou">Atualizou</option>
              <option value="excluiu">Excluiu</option>
            </select>
          </div>
          <button
            onClick={() => buscar(1)}
            disabled={loading}
            className="btn-primary"
          >
            <Search size={16} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="card p-5 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded" />
          ))}
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {!loading && resultado && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Registros de Auditoria</h3>
              <span className="text-xs text-gray-400">
                {resultado.total} registro{resultado.total !== 1 ? 's' : ''} encontrado{resultado.total !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Data/Hora</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Operação</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Tabela</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">ID</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Usuário</th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultado.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    resultado.data.map(item => {
                      const isExpanded = expandedIds.has(item.id)
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </td>
                            <td className="px-5 py-3">
                              {operacaoBadge(item.operacao)}
                            </td>
                            <td className="px-5 py-3 text-gray-700">
                              {TABELAS_LABELS[item.tabela] ?? item.tabela}
                            </td>
                            <td className="px-5 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                              {item.registro_id ?? '—'}
                            </td>
                            <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                              {item.usuario_nome ?? <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); toggleExpand(item.id) }}
                                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                                title={isExpanded ? 'Recolher' : 'Expandir'}
                              >
                                {isExpanded
                                  ? <ChevronUp size={16} />
                                  : <ChevronDown size={16} />
                                }
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={6} className="px-5 py-3">
                                <DiffView item={item} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Paginação ── */}
            {resultado.last_page > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm text-gray-500">
                  Página {resultado.current_page} de {resultado.last_page} ({resultado.total} registros)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buscar(page - 1)}
                    disabled={page <= 1 || loading}
                    className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => buscar(page + 1)}
                    disabled={page >= resultado.last_page || loading}
                    className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !resultado && (
        <div className="card p-16 text-center">
          <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Configure os filtros e clique em Buscar</p>
          <p className="text-sm text-gray-400 mt-1">Os registros de auditoria serão exibidos aqui.</p>
        </div>
      )}
    </div>
  )
}

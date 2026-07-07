import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Shirt, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { formatHorario } from '../lib/dateUtils'
import { getTipoCelebracao } from '../lib/celebracaoUtils'
import type { Escala } from '../types'

function safeParseDate(raw: string): Date {
  const s = raw.substring(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function RelatorioParamentados() {
  const hoje = new Date()
  const [de, setDe] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'))
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [loading, setLoading] = useState(false)
  const [buscou, setBuscou] = useState(false)

  async function buscar() {
    setLoading(true)
    try {
      const r = await api.get<Escala[]>(`/escalas?data_inicio=${de}&data_fim=${ate}`)
      const comParamentados = (Array.isArray(r.data) ? r.data : [])
        .filter((e) => (e.paramentados?.length ?? 0) > 0)
        .sort((a, b) => (a.celebracao?.data ?? '').localeCompare(b.celebracao?.data ?? ''))
      setEscalas(comParamentados)
      setBuscou(true)
    } catch {
      toast.error('Erro ao buscar escalas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramentados"
        subtitle="Cerimoniários paramentados em cada celebração, em destaque junto ao restante da escala"
      />

      {/* Filtros */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="input-field" />
          </div>
          <button onClick={buscar} disabled={loading} className="btn-primary">
            <Search size={16} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && buscou && escalas.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          Nenhuma celebração com paramentados encontrada no período.
        </div>
      )}

      {!loading &&
        escalas.map((escala) => {
          const celebracao = escala.celebracao
          if (!celebracao) return null
          const itens = (escala.escala_itens ?? escala.itens ?? []).filter((i) => i.cerimoniario)
          const paramentados = escala.paramentados ?? []

          return (
            <div key={escala.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-bold text-gray-900 capitalize">
                  {format(safeParseDate(celebracao.data), "EEEE, dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600">{formatHorario(celebracao.horario)}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600">{getTipoCelebracao(celebracao)}</span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {itens.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-gray-800">{item.cerimoniario?.nome}</span>
                    <span className="text-gray-400 text-xs">{item.funcao_label}</span>
                  </div>
                ))}
                {paramentados.map((c) => (
                  <div
                    key={`paramentado-${c.id}`}
                    className="flex items-center justify-between px-4 py-2 text-sm bg-amber-50"
                  >
                    <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                      <Shirt size={13} className="text-amber-600" />
                      {c.nome}
                    </span>
                    <span className="text-amber-700 text-xs font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                      Paramentado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

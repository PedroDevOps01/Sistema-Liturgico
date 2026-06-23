import { useEffect, useState, useCallback } from 'react'
import { Gift, Copy, Check, Phone } from 'lucide-react'
import { formatPhone } from '../lib/dateUtils'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { AniversarioCerimoniario } from '../types'
import PageHeader from '../components/common/PageHeader'
import { SkeletonRow } from '../components/common/LoadingSpinner'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateBR(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function gerarMensagem(nome: string): string {
  const primeiro = nome.split(' ')[0]
  return (
    `Olá, ${primeiro}! 🎉🎂\n\n` +
    `Em nome de todo o Ministério dos Acólitos, viemos te desejar um lindo aniversário!\n\n` +
    `Que Deus, nosso Pai, te abençoe neste dia especial e que Nossa Senhora te cubra com seu manto. ` +
    `Que este novo ano de vida seja cheio de saúde, alegria, paz e muitas graças divinas! 🙏\n\n` +
    `É uma honra servir ao Senhor ao seu lado. ` +
    `Continue sendo essa bênção para a nossa comunidade litúrgica! ✨\n\n` +
    `Com muito carinho,\nMinistério dos Acólitos`
  )
}

type Filtro = 'hoje' | 'semana' | 'mes' | 'todos'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'hoje',   label: 'Hoje' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mês' },
  { key: 'todos',  label: 'Todos' },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Aniversariantes() {
  const [list, setList] = useState<AniversarioCerimoniario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('mes')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const loadAniversarios = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<AniversarioCerimoniario[]>('/cerimoniarios/aniversarios')
      setList(r.data)
    } catch {
      toast.error('Erro ao carregar aniversariantes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAniversarios() }, [loadAniversarios])

  function copiarMensagem(nome: string, id: number) {
    navigator.clipboard.writeText(gerarMensagem(nome)).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2500)
    })
  }

  const currentMonth = new Date().getMonth() + 1

  const filtered = list.filter((a) => {
    if (filtro === 'hoje')   return a.dias_para_aniversario === 0
    if (filtro === 'semana') return a.dias_para_aniversario <= 7
    if (filtro === 'mes')    return a.mes_aniversario === currentMonth
    return true
  })

  const totalComData = list.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aniversariantes"
        subtitle={`${totalComData} cerimoniário${totalComData !== 1 ? 's' : ''} com data de nascimento cadastrada`}
      />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-sm">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filtro === f.key
                ? 'bg-white shadow-sm text-wine-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Birthday list ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-2.5">
          {loading ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={3} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                🎂
              </div>
              <p className="font-semibold text-gray-500">Nenhum aniversariante</p>
              <p className="text-sm text-gray-400 mt-1">
                {filtro === 'hoje'   && 'Nenhum cerimoniário faz aniversário hoje.'}
                {filtro === 'semana' && 'Nenhum aniversário nos próximos 7 dias.'}
                {filtro === 'mes'    && 'Nenhum aniversário neste mês.'}
                {filtro === 'todos'  && 'Nenhum cerimoniário com data de nascimento cadastrada.'}
              </p>
            </div>
          ) : (
            filtered.map((a) => (
              <div
                key={a.id}
                className={`card p-4 flex items-center gap-4 transition-colors ${
                  a.dias_para_aniversario === 0
                    ? 'border-amber-200 bg-amber-50/60'
                    : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-400 text-xs font-bold">
                    {a.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {a.nome}
                    {a.dias_para_aniversario === 0 && (
                      <span className="ml-1.5">🎂</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {formatDateBR(a.data_nascimento)}
                    </span>
                    {a.numero && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone size={11} />
                        {formatPhone(a.numero)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {a.dias_para_aniversario === 0 ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Hoje · {a.idade} anos
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-medium text-right">
                      Em {a.dias_para_aniversario} dia{a.dias_para_aniversario !== 1 ? 's' : ''}
                      <br />
                      <span className="text-gray-400">{a.idade} anos</span>
                    </span>
                  )}
                  <button
                    onClick={() => copiarMensagem(a.nome, a.id)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors text-wine-700 hover:text-wine-900"
                  >
                    {copiedId === a.id ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="text-green-600">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copiar mensagem
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Message preview panel ─────────────────────────────────── */}
        <div className="card p-5 sticky top-6">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-wine-700" />
            <p className="text-sm font-semibold text-gray-700">Modelo de mensagem</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Clique em "Copiar mensagem" ao lado do nome para copiar a versão personalizada.
          </p>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
            {gerarMensagem('Nome')}
          </pre>
        </div>
      </div>
    </div>
  )
}

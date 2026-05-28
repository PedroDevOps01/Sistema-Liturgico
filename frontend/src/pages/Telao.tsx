import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Cross, Clock, RefreshCw } from 'lucide-react'
import api from '../lib/api'
import type { Celebracao } from '../types'

interface TelaoEscala {
  celebracao: Celebracao
  itens: Array<{
    id: number
    funcao_label?: string
    cerimoniario?: { nome: string }
  }>
}

function formatData(data: string) {
  try {
    const [y, m, d] = data.split('-').map(Number)
    return format(new Date(y, m - 1, d), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return data
  }
}

export default function Telao() {
  const [escalas, setEscalas] = useState<TelaoEscala[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  async function loadEscalas() {
    try {
      const hoje = new Date().toISOString().substring(0, 10)
      const r = await api.get<{ celebracao: Celebracao; itens: TelaoEscala['itens'] }[]>(
        `/escalas?data_inicio=${hoje}&data_fim=${hoje}`
      )
      // Map escalas response to TelaoEscala shape
      const mapped: TelaoEscala[] = (r.data as unknown as Array<{
        celebracao?: Celebracao
        escala_itens?: TelaoEscala['itens']
        itens?: TelaoEscala['itens']
      }>)
        .filter((e) => e.celebracao)
        .map((e) => ({
          celebracao: e.celebracao!,
          itens: e.escala_itens ?? e.itens ?? [],
        }))
      setEscalas(mapped)
      setLastUpdate(new Date())
    } catch {
      // Silently fail for display mode
    } finally {
      setLoading(false)
    }
  }

  // Clock update every second
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  // Refresh data every 2 minutes
  useEffect(() => {
    loadEscalas()
    const interval = setInterval(loadEscalas, 2 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Gold top banner */}
      <header className="bg-gold-500 px-6 sm:px-10 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <Cross size={22} className="text-gold-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black leading-tight">Escala Litúrgica</h1>
              <p className="text-black/70 text-sm capitalize font-medium">
                {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-4xl sm:text-5xl font-black font-mono text-black tabular-nums leading-none">
              {format(currentTime, 'HH:mm')}
            </div>
            <div className="text-black/50 text-xs flex items-center gap-1 justify-end mt-1">
              <RefreshCw size={10} />
              {format(lastUpdate, 'HH:mm:ss')}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-gold-400 animate-spin" />
            </div>
          ) : escalas.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Cross size={48} className="text-white/20" />
              </div>
              <p className="text-3xl font-bold text-white/50">Nenhuma escala para hoje</p>
              <p className="text-white/30 text-xl mt-3">Que Deus abençoe a todos!</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              escalas.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : escalas.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {escalas.map((item) => (
                <div
                  key={item.celebracao.id}
                  className="rounded-2xl border border-white/10 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  {/* Celebration Header */}
                  <div className="px-6 py-5 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="text-gold-400 text-xs font-bold uppercase tracking-widest mb-2">
                      {formatData(item.celebracao.data)}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 bg-gold-500/15 border border-gold-500/30 text-gold-400 rounded-xl px-4 py-2">
                        <Clock size={18} />
                        <span className="text-2xl font-black tabular-nums">{item.celebracao.horario}</span>
                      </div>
                      <div className="text-white/60 text-base font-medium">
                        {item.celebracao.periodo_liturgico}
                      </div>
                    </div>
                    {/* Flags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.celebracao.celebracao_noite && (
                        <span className="bg-blue-900/60 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-700/50 font-medium">Noite</span>
                      )}
                      {item.celebracao.possui_bispo && (
                        <span className="bg-purple-900/60 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-700/50 font-medium">Bispo</span>
                      )}
                      {item.celebracao.casamento && (
                        <span className="bg-amber-900/60 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-700/50 font-medium">Casamento</span>
                      )}
                      {item.celebracao.batismo && (
                        <span className="bg-cyan-900/60 text-cyan-300 text-xs px-3 py-1 rounded-full border border-cyan-700/50 font-medium">Batismo</span>
                      )}
                      {item.celebracao.crisma && (
                        <span className="bg-indigo-900/60 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-700/50 font-medium">Crisma</span>
                      )}
                    </div>
                  </div>

                  {/* Scale Items */}
                  <div className="divide-y divide-white/5">
                    {item.itens.length === 0 ? (
                      <div className="text-center py-10 text-white/30 text-base">
                        Escala não montada
                      </div>
                    ) : (
                      item.itens.map((escalaItem, idx) => (
                        <div key={escalaItem.id} className="px-6 py-4 flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/10 text-gold-400 flex items-center justify-center text-sm font-black flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-gold-500/80 text-xs font-semibold uppercase tracking-wide leading-none mb-1">
                              {escalaItem.funcao_label || 'Cerimoniário'}
                            </div>
                            <div className="text-white text-xl font-black leading-tight truncate">
                              {escalaItem.cerimoniario?.nome || (
                                <span className="text-white/30 italic font-normal text-base">Não atribuído</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-3 text-center flex-shrink-0">
        <p className="text-white/20 text-xs">
          Sistema de Escalas Litúrgicas — Que Deus abençoe a todos os que servem!
        </p>
      </footer>
    </div>
  )
}

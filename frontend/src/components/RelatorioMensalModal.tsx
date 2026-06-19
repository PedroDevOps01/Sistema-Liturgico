import { useEffect, useState } from 'react'
import { X, FileDown, Clock } from 'lucide-react'
import api from '../lib/api'

interface StatusData {
  deve_mostrar: boolean
  mes_relatorio?: string
  label_mes?: string
}

export default function RelatorioMensalModal() {
  const [data, setData]       = useState<StatusData | null>(null)
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    api.get<StatusData>('/relatorio/mensal/status')
      .then(r => { if (r.data.deve_mostrar) setData(r.data) })
      .catch(() => {})
  }, [])

  async function handleBaixar() {
    if (!data?.mes_relatorio) return
    setBaixando(true)
    try {
      const [year, month] = data.mes_relatorio.split('-')
      const r = await api.get(`/relatorio/mensal/${year}/${month}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `relatorio-${data.mes_relatorio}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      await marcar('downloaded')
    } catch {
      /* silencioso */
    } finally {
      setBaixando(false)
    }
  }

  async function marcar(status: 'downloaded' | 'dismissed') {
    await api.post('/relatorio/mensal/marcar-recebido', { status }).catch(() => {})
    setData(null)
  }

  if (!data) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => marcar('dismissed')} />

      <div className="relative bg-white w-full max-w-sm sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sidebar-gradient p-6 pb-5">
          <button
            onClick={() => marcar('dismissed')}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mb-3">
            <FileDown size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">Relatório Mensal Disponível</h2>
          <p className="text-white/70 text-sm mt-1">
            {data.label_mes ? `${data.label_mes.charAt(0).toUpperCase()}${data.label_mes.slice(1)}` : 'Mês anterior'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            O relatório do mês anterior está pronto. Ele inclui celebrações realizadas, ranking de assiduidade, presença média e muito mais.
          </p>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Clock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Este aviso aparece apenas uma vez por mês, no primeiro acesso.</p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleBaixar}
              disabled={baixando}
              className="btn-primary w-full justify-center"
            >
              <FileDown size={16} />
              {baixando ? 'Gerando PDF...' : 'Baixar Relatório em PDF'}
            </button>
            <button
              onClick={() => marcar('dismissed')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

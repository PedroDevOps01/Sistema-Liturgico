import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, AlertTriangle, Info, Megaphone } from 'lucide-react'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'

interface Comunicado {
  id: number
  titulo: string
  corpo: string
  tipo: 'info' | 'aviso' | 'urgente'
  created_at: string
}

const TIPO_CFG = {
  info:    { label: 'Informação', color: '#3B82F6', bg: '#3B82F615', icon: Info        },
  aviso:   { label: 'Aviso',      color: '#fbbf24', bg: '#fbbf2415', icon: AlertTriangle },
  urgente: { label: 'Urgente',    color: '#EF4444', bg: '#EF444415', icon: Megaphone    },
}

export default function MembroComunicados() {
  const [lista, setLista]     = useState<Comunicado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    membroApi.get<Comunicado[]>('/comunicados')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <style>{`
        @keyframes comFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .com-card { animation: comFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="space-y-5">
        <div className="com-card">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={22} style={{ color: GOLD }} /> Comunicados
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Avisos e informações do ministério</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          </div>
        ) : !lista.length ? (
          <div className="com-card card p-14 text-center">
            <Bell size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">Nenhum comunicado</p>
            <p className="text-sm text-gray-400 mt-1">Os avisos do ministério aparecerão aqui.</p>
          </div>
        ) : (
          lista.map((c, idx) => {
            const cfg = TIPO_CFG[c.tipo] ?? TIPO_CFG.info
            const Icon = cfg.icon
            return (
              <div key={c.id} className="com-card card overflow-hidden"
                style={{ animationDelay: `${idx * 0.06}s`, borderLeft: `4px solid ${cfg.color}` }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon size={15} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{c.titulo}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">
                      {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.corpo}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

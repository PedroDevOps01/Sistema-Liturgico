import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, AlertTriangle, Info, Megaphone, X, Clock, MessageCircle, Calendar, GraduationCap, Users, Zap } from 'lucide-react'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const WINE = '#7c2d3e'

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

const ROADMAP = [
  {
    icon: Bell,
    titulo: 'Comunicados Gerais',
    items: ['Envio em massa para todos os membros', 'Envio por grupos', 'Envio por função', 'Envio por equipes'],
  },
  {
    icon: Calendar,
    titulo: 'Celebrações',
    items: ['Envio automático da escala', 'Lembrete 24h antes', 'Lembrete no dia'],
  },
  {
    icon: Users,
    titulo: 'Aniversários',
    items: ['Mensagem automática de parabéns'],
  },
  {
    icon: MessageCircle,
    titulo: 'Reuniões',
    items: ['Convite automático', 'Lembrete automático', 'Envio apenas aos convidados'],
  },
  {
    icon: GraduationCap,
    titulo: 'Treinamentos',
    items: ['Convite automático', 'Lembretes', 'Apenas para os participantes'],
  },
]

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${WINE} 0%, #5a1a28 100%)` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}25` }}>
              <Clock size={20} style={{ color: GOLD }} />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">Em Desenvolvimento</p>
              <p className="text-xs" style={{ color: `${GOLD}cc` }}>Seção de Comunicados</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">
            Esta seção está sendo desenvolvida. Em breve você poderá receber lembretes automáticos pelo
            <strong className="text-white"> WhatsApp</strong> e pelo portal, além de comunicados do admin.
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Roadmap */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} style={{ color: GOLD }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: WINE }}>
              Comunicação Automática — O que vem por aí
            </p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed -mt-2">
            O objetivo é centralizar toda a comunicação para reduzir a dependência do WhatsApp.
          </p>

          {ROADMAP.map(({ icon: Icon, titulo, items }) => (
            <div key={titulo} className="rounded-xl overflow-hidden border border-gray-100">
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: `${WINE}08` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${WINE}18` }}>
                  <Icon size={14} style={{ color: WINE }} />
                </div>
                <p className="font-semibold text-gray-900 text-sm">{titulo}</p>
              </div>
              <ul className="px-4 py-3 space-y-1.5">
                {items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${WINE} 0%, #5a1a28 100%)` }}
          >
            Entendido, vamos lá!
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MembroComunicados() {
  const [lista, setLista]         = useState<Comunicado[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(true)

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

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}

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

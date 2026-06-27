import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, List, CalendarDays, Gift, User, LogOut, Camera,
  ClipboardCheck, Bell, Users, Phone, TrendingUp, ArrowLeftRight,
  CalendarOff, FileText, BookOpen, ChevronDown,
} from 'lucide-react'
import { getMembroUser, removeMembroToken, removeMembroUser, setMembroUser } from '../../lib/membroAuth'
import membroApi from '../../lib/membroApi'
import axios from 'axios'
import toast from 'react-hot-toast'
import logogrupo from '../../assets/logogrupo.png'
import { useNotificacoes } from '../../contexts/NotificacoesContext'

// ── Nav groups ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/membro/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Atividades',
    items: [
      { to: '/membro/escalas',       icon: List,          label: 'Minhas Escalas'   },
      { to: '/membro/presencas',     icon: ClipboardCheck,label: 'Presenças'         },
      { to: '/membro/substituicoes', icon: ArrowLeftRight, label: 'Substituições'   },
      { to: '/membro/calendario',    icon: CalendarDays,   label: 'Calendário'       },
      { to: '/membro/reunioes',      icon: Users,          label: 'Reuniões'         },
      { to: '/membro/treinamentos',  icon: BookOpen,       label: 'Treinamentos'     },
    ],
  },
  {
    label: 'Comunidade',
    items: [
      { to: '/membro/comunicados',     icon: Bell,     label: 'Comunicados'      },
      { to: '/membro/contatos',        icon: Phone,    label: 'Contatos'          },
      { to: '/membro/aniversariantes', icon: Gift,     label: 'Aniversários'      },
    ],
  },
  {
    label: 'Materiais',
    items: [
      { to: '/membro/documentos', icon: FileText, label: 'Documentos' },
    ],
  },
  {
    label: 'Meu Perfil',
    items: [
      { to: '/membro/perfil',         icon: User,        label: 'Dados Pessoais'   },
      { to: '/membro/estatisticas',   icon: TrendingUp,  label: 'Estatísticas'     },
      { to: '/membro/bloqueio-datas', icon: CalendarOff, label: 'Datas Bloqueadas' },
    ],
  },
]

// All route paths that belong to each group (used to determine if group is active)
function groupContainsActive(group: typeof NAV_GROUPS[0], pathname: string) {
  return group.items.some(item => pathname.startsWith(item.to))
}

// ── NavGroup component ──────────────────────────────────────────────────────

function NavGroup({
  group,
  unreadCount,
  marcarTodosLidos,
}: {
  group: typeof NAV_GROUPS[0]
  unreadCount: number
  marcarTodosLidos: () => void
}) {
  const location = useLocation()
  const isGroupActive = groupContainsActive(group, location.pathname)
  const [open, setOpen] = useState(isGroupActive)

  // Keep open if navigating into the group
  useEffect(() => {
    if (isGroupActive) setOpen(true)
  }, [isGroupActive])

  return (
    <div className="mb-1">
      {/* Group header button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
          isGroupActive ? 'text-amber-400/90' : 'text-white/30 hover:text-white/50'
        }`}
      >
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={12}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (to === '/membro/comunicados') marcarTodosLidos() }}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/15'
                    : 'text-orange-100/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                  <span className="flex-1 text-[13px]">{label}</span>
                  {to === '/membro/comunicados' && unreadCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: '#EF4444', color: 'white' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main sidebar ────────────────────────────────────────────────────────────

export default function MembroSidebar() {
  const navigate = useNavigate()
  const user     = getMembroUser()
  const initials = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'
  const fotoRef  = useRef<HTMLInputElement>(null)
  const [foto, setFoto]           = useState(user?.foto_base64 ?? null)
  const [uploading, setUploading] = useState(false)
  const [logoMinisterio, setLogoMinisterio] = useState<string | null>(null)
  const { unreadCount, marcarTodosLidos, pedirPermissao } = useNotificacoes()

  useEffect(() => { pedirPermissao() }, [])

  useEffect(() => {
    axios.get<{ logo_ministerio_base64?: string | null }>('/api/portal-config')
      .then(r => setLogoMinisterio(r.data?.logo_ministerio_base64 ?? null))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    try { await membroApi.post('/logout') } catch {}
    removeMembroToken(); removeMembroUser()
    toast.success('Sessão encerrada')
    navigate('/membro/login')
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setUploading(true)
      try {
        const r = await membroApi.post<{ foto_base64: string | null }>('/foto', { foto_base64: base64 })
        const nova = (r.data as { foto_base64?: string | null }).foto_base64 ?? null
        setFoto(nova)
        setMembroUser({ ...user!, foto_base64: nova })
        toast.success('Foto atualizada!')
      } catch { toast.error('Erro ao enviar foto') }
      finally { setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="sidebar-gradient flex flex-col h-full w-full select-none text-white">

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {logoMinisterio ? (
            <img src={logoMinisterio} alt="Logo do ministério" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-1">
              <img src={logogrupo} alt="Ministério dos Acólitos" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Portal do Cerimoniário</p>
          <p className="text-xs leading-none mt-0.5 text-white/45">Ministério dos Acólitos</p>
        </div>
      </div>

      {/* Member card */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">

            {/* Avatar with upload */}
            <div className="relative group flex-shrink-0">
              <div
                className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer"
                style={{ boxShadow: '0 0 0 2px #fbbf24, 0 4px 12px rgba(0,0,0,0.4)' }}
                onClick={() => fotoRef.current?.click()}
                title="Clique para alterar foto">
                {foto ? (
                  <img src={foto} className="w-full h-full object-cover" alt={user?.nome ?? ''} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#431407' }}>
                    {initials}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fotoRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/90 text-orange-800 shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Alterar foto">
                <Camera size={10} />
              </button>
            </div>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />

            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate">{user?.nome}</p>
              <p className="text-xs mt-0.5 truncate text-white/45">@{user?.usuario}</p>
              <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: user?.mestre ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)',
                  color: user?.mestre ? '#fbbf24' : 'rgba(255,255,255,0.45)',
                }}>
                {user?.mestre ? '★ Mestre' : 'Cerimoniário'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {NAV_GROUPS.map(group => (
          <NavGroup
            key={group.label}
            group={group}
            unreadCount={unreadCount}
            marcarTodosLidos={marcarTodosLidos}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6 pt-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-orange-100/60 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
          Sair do portal
        </button>
      </div>
    </aside>
  )
}

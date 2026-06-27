import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, List, CalendarDays, Gift, User, LogOut, Camera, ClipboardCheck, Bell, Users, Phone, TrendingUp, ArrowLeftRight, CalendarOff, FileText, BookOpen } from 'lucide-react'
import { getMembroUser, removeMembroToken, removeMembroUser, setMembroUser } from '../../lib/membroAuth'
import membroApi from '../../lib/membroApi'
import toast from 'react-hot-toast'
import logogrupo from '../../assets/logogrupo.png'
import { useNotificacoes } from '../../contexts/NotificacoesContext'

const NAV = [
  { to: '/membro/dashboard',       icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/membro/presencas',       icon: ClipboardCheck,  label: 'Presenças'       },
  { to: '/membro/escalas',         icon: List,            label: 'Minhas Escalas'  },
  { to: '/membro/substituicoes',   icon: ArrowLeftRight,  label: 'Substituições'   },
  { to: '/membro/calendario',      icon: CalendarDays,    label: 'Calendário'      },
  { to: '/membro/comunicados',     icon: Bell,            label: 'Comunicados'     },
  { to: '/membro/reunioes',        icon: Users,           label: 'Reuniões'        },
  { to: '/membro/treinamentos',    icon: BookOpen,        label: 'Treinamentos'    },
  { to: '/membro/contatos',        icon: Phone,           label: 'Contatos'        },
  { to: '/membro/estatisticas',    icon: TrendingUp,      label: 'Estatísticas'    },
  { to: '/membro/bloqueio-datas',  icon: CalendarOff,     label: 'Datas Bloqueadas'},
  { to: '/membro/documentos',      icon: FileText,        label: 'Documentos'      },
  { to: '/membro/aniversariantes', icon: Gift,            label: 'Aniversários'    },
  { to: '/membro/perfil',          icon: User,            label: 'Meu Perfil'      },
]

export default function MembroSidebar() {
  const navigate  = useNavigate()
  const user      = getMembroUser()
  const initials  = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'
  const fotoRef   = useRef<HTMLInputElement>(null)
  const [foto, setFoto]     = useState(user?.foto_base64 ?? null)
  const [uploading, setUploading] = useState(false)
  const { unreadCount, marcarTodosLidos, pedirPermissao } = useNotificacoes()

  useEffect(() => { pedirPermissao() }, [])

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
          <div className="w-full h-full flex items-center justify-center p-1">
            <img src={logogrupo} alt="Ministério dos Acólitos" className="w-full h-full object-contain" />
          </div>
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => { if (to === '/membro/comunicados') marcarTodosLidos() }}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                isActive
                  ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/15'
                  : 'text-orange-100/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {to === '/membro/comunicados' && unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: '#EF4444', color: 'white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
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

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  List,
  UserCog,
  Settings,
  LogOut,
  Cross,
  Monitor,
} from 'lucide-react'
import { removeToken, removeUser, getUser } from '../../lib/auth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Cerimoniários', icon: Users, to: '/cerimoniarios' },
  { label: 'Celebrações', icon: Calendar, to: '/celebracoes' },
  { label: 'Escalas', icon: List, to: '/escalas' },
  { label: 'Usuários', icon: UserCog, to: '/usuarios' },
  { label: 'Telão', icon: Monitor, to: '/telao' },
  { label: 'Configurações', icon: Settings, to: '/configuracoes' },
]

interface SidebarProps {
  onCloseMobile?: () => void
}

export default function Sidebar({ onCloseMobile }: SidebarProps) {
  const navigate = useNavigate()
  const user = getUser()

  async function handleLogout() {
    try {
      await api.post('/logout')
    } catch {
      // ignore
    } finally {
      removeToken()
      removeUser()
      toast.success('Sessão encerrada')
      navigate('/login')
    }
  }

  const initials = user?.nome
    ? user.nome
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <aside className="flex flex-col h-full bg-wine-900 text-white w-64 min-w-[256px]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
          <Cross size={20} className="text-black" />
        </div>
        <div>
          <div className="font-bold text-base leading-tight text-white">Escala Litúrgica</div>
          <div className="text-white/40 text-xs">Sistema de Gestão</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-[15px] font-medium ${
                isActive
                  ? 'bg-gold-500 text-black font-semibold shadow-sm'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-1">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-400 text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.nome}</div>
              <div className="text-white/40 text-xs truncate">@{user.usuario}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}

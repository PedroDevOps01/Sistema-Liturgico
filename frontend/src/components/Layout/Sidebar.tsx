import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  List,
  BarChart2,
  UserCog,
  Settings,
  LogOut,
  Cross,
} from 'lucide-react'
import { removeToken, removeUser, getUser } from '../../lib/auth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Cerimoniários', icon: Users, to: '/cerimoniarios' },
  { label: 'Celebrações', icon: Calendar, to: '/celebracoes' },
  { label: 'Calendário', icon: CalendarDays, to: '/calendario' },
  { label: 'Escalas', icon: List, to: '/escalas' },
  { label: 'Relatório', icon: BarChart2, to: '/relatorio' },
  { label: 'Usuários', icon: UserCog, to: '/usuarios' },
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
    <aside className="sidebar-gradient flex flex-col h-full text-white w-64 min-w-[256px]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
             style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
          <Cross size={20} className="text-wine-900" />
        </div>
        <div>
          <div className="font-bold text-base leading-tight text-white">Escala Litúrgica</div>
          <div className="text-orange-200/60 text-xs">Sistema de Gestão</div>
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
                  ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/20 backdrop-blur-sm'
                  : 'text-orange-100/80 hover:bg-white/10 hover:text-white'
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
              <span className="text-wine-900 text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.nome}</div>
              <div className="text-orange-200/50 text-xs truncate">@{user.usuario}</div>
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

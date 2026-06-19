import { useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  History,
  GraduationCap,
  Globe,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Activity,
} from 'lucide-react'
import { removeToken, removeUser, getUser } from '../../lib/auth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

/* ── Data ─────────────────────────────────────────────── */
interface NavItem {
  label: string
  icon: React.ElementType
  to: string
}

interface Module {
  id: string
  label: string
  icon: React.ElementType
  items: NavItem[]
  standalone?: boolean
}

const modules: Module[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/' }],
  },
  {
    id: 'cadastro',
    label: 'Cadastro',
    icon: Users,
    items: [
      { label: 'Cerimoniários', icon: Users,    to: '/cerimoniarios' },
      { label: 'Celebrações',   icon: Calendar, to: '/celebracoes' },
    ],
  },
  {
    id: 'escalonamento',
    label: 'Escalonamento',
    icon: ListChecks,
    items: [
      { label: 'Escalas',    icon: List,        to: '/escalas' },
      { label: 'Calendário', icon: CalendarDays, to: '/calendario' },
    ],
  },
  {
    id: 'acompanhamento',
    label: 'Acompanhamento',
    icon: History,
    items: [
      { label: 'Histórico',    icon: History,       to: '/historico' },
      { label: 'Treinamentos', icon: GraduationCap, to: '/treinamentos' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart2,
    items: [
      { label: 'Relatório',  icon: BarChart2, to: '/relatorio'  },
      { label: 'Analytics',  icon: Activity,  to: '/analytics'  },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: UserCog,
    items: [
      { label: 'Usuários',      icon: UserCog,  to: '/usuarios' },
      { label: 'Configurações', icon: Settings, to: '/configuracoes' },
    ],
  },
  {
    id: 'portal',
    label: 'Portal',
    icon: Globe,
    items: [
      { label: 'Portal Público', icon: Globe,  to: '/portal-config' },
      { label: 'Interessados',   icon: Heart,  to: '/interessados' },
    ],
  },
]

/* ── Props ────────────────────────────────────────────── */
interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onCloseMobile?: () => void
  onOpenSearch?: () => void
}

/* ── Component ────────────────────────────────────────── */
export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onCloseMobile,
  onOpenSearch,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()

  const [hoveredModule, setHoveredModule] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function isModuleActive(mod: Module) {
    return mod.items.some(item =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    )
  }

  function onModuleEnter(moduleId: string, el: HTMLElement) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    const rect = el.getBoundingClientRect()
    setFlyoutTop(rect.top + rect.height / 2)
    setHoveredModule(moduleId)
  }

  function onLeave() {
    leaveTimer.current = setTimeout(() => setHoveredModule(null), 180)
  }

  function clearLeave() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }

  async function handleLogout() {
    try { await api.post('/logout') } catch { /* ignore */ }
    finally {
      removeToken(); removeUser()
      toast.success('Sessão encerrada')
      navigate('/login')
    }
  }

  const initials = user?.nome
    ? user.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U'

  const flyoutModule = hoveredModule ? modules.find(m => m.id === hoveredModule) : null

  return (
    <aside className="sidebar-gradient flex flex-col h-full text-white w-full">

      {/* ── Logo / header ─────────────────────── */}
      <div className={`flex border-b border-white/10 flex-shrink-0 ${
        collapsed
          ? 'flex-col items-center gap-2 px-2 py-4'
          : 'flex-row items-center gap-3 px-5 py-5'
      }`}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
        >
          <Cross size={20} className="text-wine-900" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight text-white">Ministério dos Acólitos</div>
            <div className="text-orange-200/60 text-xs">Sistema de Gestão</div>
          </div>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* ── Search ────────────────────────────── */}
      {!collapsed ? (
        <button
          onClick={onOpenSearch}
          className="mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-orange-100/60 transition-all hover:bg-white/10 hover:text-white flex-shrink-0"
        >
          <Search size={15} className="flex-shrink-0" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-orange-100/40">⌃K</kbd>
        </button>
      ) : (
        <button
          onClick={onOpenSearch}
          title="Buscar (⌃K)"
          className="mx-auto mt-3 w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-100/60 transition-all hover:bg-white/10 hover:text-white flex-shrink-0"
        >
          <Search size={16} />
        </button>
      )}

      {/* ── Navigation ────────────────────────── */}
      <nav className={`flex-1 py-3 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {collapsed ? (
          /* Icon-only mode */
          <div className="space-y-1">
            {modules.map(mod => {
              const ModIcon = mod.icon
              const active = isModuleActive(mod)
              const isSingle = mod.items.length === 1

              const iconClass = `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-sm border border-white/20'
                  : 'text-orange-100/70 hover:bg-white/10 hover:text-white'
              }`

              return isSingle ? (
                <NavLink
                  key={mod.id}
                  to={mod.items[0].to}
                  end={mod.items[0].to === '/'}
                  onClick={onCloseMobile}
                  title={mod.items[0].label}
                  className={({ isActive }) =>
                    `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm border border-white/20'
                        : 'text-orange-100/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <ModIcon size={18} />
                </NavLink>
              ) : (
                <div
                  key={mod.id}
                  onMouseEnter={e => onModuleEnter(mod.id, e.currentTarget)}
                  onMouseLeave={onLeave}
                >
                  <button className={iconClass}>
                    <ModIcon size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* Expanded: grouped by module */
          <div className="space-y-0.5">
            {modules.map((mod, modIdx) => {
              const isSingle = mod.items.length === 1 && !mod.standalone
              return (
                <div key={mod.id} className={modIdx > 0 ? 'pt-2' : ''}>
                  {!isSingle && (
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-4 pb-1 pt-1">
                      {mod.label}
                    </p>
                  )}
                  {mod.items.map(item => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-[15px] font-medium ${
                            isActive
                              ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/20 backdrop-blur-sm'
                              : 'text-orange-100/80 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        <ItemIcon size={18} className="flex-shrink-0" />
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── User + Logout ─────────────────────── */}
      <div className={`border-t border-white/10 pt-3 pb-4 flex-shrink-0 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            >
              <span className="text-wine-900 text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.nome}</div>
              <div className="text-orange-200/50 text-xs truncate">@{user.usuario}</div>
            </div>
          </div>
        )}
        {user && collapsed && (
          <div
            className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl mb-1"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            title={`${user.nome} (@${user.usuario})`}
          >
            <span className="text-wine-900 text-xs font-bold">{initials}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={`flex items-center gap-3 w-full py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm font-medium ${
            collapsed ? 'justify-center px-0' : 'px-4'
          }`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>

      {/* ── Collapsed flyout (fixed, over content) ── */}
      {collapsed && flyoutModule && (
        <div
          className="fixed z-[9999]"
          style={{ left: 80, top: flyoutTop, transform: 'translateY(-50%)' }}
          onMouseEnter={clearLeave}
          onMouseLeave={onLeave}
        >
          <div
            className="sidebar-gradient rounded-2xl overflow-hidden shadow-2xl min-w-[200px]"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 text-white/40"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {flyoutModule.label}
            </p>
            {flyoutModule.items.map(item => {
              const ItemIcon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => { setHoveredModule(null); onCloseMobile?.() }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/20 text-white border-l-2 border-white/50'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <ItemIcon size={16} className="flex-shrink-0" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}

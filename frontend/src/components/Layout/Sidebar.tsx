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
  History,
  GraduationCap,
  ClipboardList,
  FileText,
  Globe,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ListChecks,
  Activity,
  Gift,
  Shirt,
  BookOpen,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Camera,
  Megaphone,
  ClipboardCheck,
} from 'lucide-react'
import logogrupo from '../../assets/logogrupo.png'
import { removeToken, removeUser, getUser } from '../../lib/auth'
import { useConfig } from '../../contexts/ConfigContext'
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
    label: 'Dashboard',
    icon: LayoutDashboard,
    standalone: true,
    items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/' }],
  },
  {
    id: 'cadastro',
    label: 'Cadastro',
    icon: Users,
    items: [
      { label: 'Cerimoniários', icon: Users,    to: '/cerimoniarios' },
      { label: 'Celebrações',   icon: Calendar, to: '/celebracoes'   },
    ],
  },
  {
    id: 'escalonamento',
    label: 'Escalonamento',
    icon: ListChecks,
    items: [
      { label: 'Escalas',    icon: List,         to: '/escalas'    },
      { label: 'Calendário', icon: CalendarDays,  to: '/calendario' },
    ],
  },
  {
    id: 'acompanhamento',
    label: 'Acompanhamento',
    icon: History,
    items: [
      { label: 'Histórico',       icon: History,       to: '/historico'      },
      { label: 'Treinamentos',    icon: GraduationCap, to: '/treinamentos'   },
      { label: 'Reuniões',        icon: ClipboardList, to: '/reunioes'       },
      { label: 'Aniversariantes', icon: Gift,          to: '/aniversariantes'},
      { label: 'Comunicados',     icon: Megaphone,     to: '/comunicados'    },
      { label: 'Justificativas',  icon: ClipboardCheck, to: '/justificativas'},
    ],
  },
  {
    id: 'ministerio',
    label: 'Ministério',
    icon: BookOpen,
    items: [
      { label: 'Formação',          icon: BookOpen, to: '/formacao' },
      { label: 'Documentos',        icon: FileText, to: '/documentos' },
      { label: 'Controle de Túnicas', icon: Shirt,  to: '/tunicas'  },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart2,
    items: [
      { label: 'Presenças',                icon: BarChart2,     to: '/relatorio'                  },
      { label: 'Frequência Individual',    icon: UserCheck,     to: '/relatorios/frequencia'      },
      { label: 'Crescimento',              icon: TrendingUp,    to: '/relatorios/crescimento'     },
      { label: 'Treinamentos',             icon: GraduationCap, to: '/relatorios/treinamentos'    },
      { label: 'Reuniões',                 icon: ClipboardList, to: '/relatorios/reunioes'         },
      { label: 'Empréstimos de Túnicas',   icon: Shirt,         to: '/relatorios/tunicas'         },
      { label: 'Paramentados',             icon: Shirt,         to: '/relatorios/paramentados'    },
      { label: 'Assiduidade',              icon: UserCheck,     to: '/relatorios/assiduidade'     },
      { label: 'Auditoria do Sistema',     icon: ShieldCheck,   to: '/relatorios/auditoria'       },
      { label: 'Analytics',                icon: Activity,      to: '/analytics'                  },
    ],
  },
  {
    id: 'portal',
    label: 'Portal',
    icon: Globe,
    items: [
      { label: 'Portal Público', icon: Globe,  to: '/portal-config' },
      { label: 'Interessados',   icon: Heart,  to: '/interessados'  },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: UserCog,
    items: [
      { label: 'Usuários',      icon: UserCog,  to: '/usuarios'       },
      { label: 'Configurações', icon: Settings, to: '/configuracoes'  },
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

  /* collapsed flyout */
  const [hoveredModule, setHoveredModule] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* accordion open state – default: open the active module */
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const active = modules.find(m =>
      m.items.some(i =>
        i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)
      )
    )
    return new Set(active ? [active.id] : [])
  })

  function toggleModule(id: string) {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const { config, refreshConfig } = useConfig()
  const logoCustom = config?.logo_ministerio_base64 ?? null
  const logoFileRef = useRef<HTMLInputElement>(null)

  async function handleLogoMinisterio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 2 MB'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await api.post('/configuracoes/logo-ministerio', { logo_ministerio_base64: reader.result as string })
        await refreshConfig()
        toast.success('Logo do ministério atualizado!')
      } catch { toast.error('Erro ao salvar logo') }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleRemoveLogoMinisterio() {
    try {
      await api.post('/configuracoes/logo-ministerio', { logo_ministerio_base64: null })
      await refreshConfig()
      toast.success('Logo removido.')
    } catch { toast.error('Erro ao remover logo') }
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
        <div className="relative group flex-shrink-0">
          {/* Card — fills completely when há logo customizado, padding quando padrão */}
          <div
            className="w-10 h-10 rounded-xl shadow-lg overflow-hidden cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            onClick={() => logoFileRef.current?.click()}
            title="Clique para trocar o logo do ministério"
          >
            {logoCustom ? (
              <img
                src={logoCustom}
                alt="Logo do ministério"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-1.5">
                <img src={logogrupo} alt="Ministério dos Acólitos" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          {/* Trocar logo (camera) */}
          <button
            onClick={() => logoFileRef.current?.click()}
            title="Trocar logo"
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/90 text-wine-900 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <Camera size={10} />
          </button>

          {/* Remover logo — só aparece quando há logo customizado */}
          {logoCustom && (
            <button
              onClick={e => { e.stopPropagation(); handleRemoveLogoMinisterio() }}
              title="Remover logo"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold text-[10px] leading-none"
              style={{ background: '#ef4444', color: 'white' }}
            >
              ×
            </button>
          )}

          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoMinisterio} />
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
      <nav className={`flex-1 py-3 overflow-y-auto sidebar-scroll ${collapsed ? 'px-2' : 'px-3'}`}>
        {collapsed ? (
          /* ── Icon-only mode ── */
          <div className="space-y-1">
            {modules.map(mod => {
              const ModIcon = mod.icon
              const active = isModuleActive(mod)
              const isSingle = mod.items.length === 1

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
                  <button
                    className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                      active
                        ? 'bg-white/20 text-white shadow-sm border border-white/20'
                        : 'text-orange-100/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <ModIcon size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Expanded: accordion by module ── */
          <div className="space-y-0.5">
            {modules.map(mod => {
              const ModIcon = mod.icon
              const isActive = isModuleActive(mod)
              const isOpen = openModules.has(mod.id)

              /* standalone items (Dashboard) render as plain NavLink */
              if (mod.standalone) {
                return (
                  <NavLink
                    key={mod.id}
                    to={mod.items[0].to}
                    end
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                        isActive
                          ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/20 backdrop-blur-sm'
                          : 'text-orange-100/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <ModIcon size={17} className="flex-shrink-0" />
                    {mod.items[0].label}
                  </NavLink>
                )
              }

              return (
                <div key={mod.id}>
                  {/* Module header – clickable toggle */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold ${
                      isActive
                        ? 'text-white bg-white/10'
                        : 'text-orange-100/60 hover:text-orange-100/90 hover:bg-white/5'
                    }`}
                  >
                    <ModIcon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{mod.label}</span>
                    <ChevronDown
                      size={14}
                      className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Subitems – animated via CSS grid trick */}
                  <div
                    className={`grid transition-all duration-200 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5 pb-1">
                        {mod.items.map(item => {
                          const ItemIcon = item.icon
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              end={item.to === '/'}
                              onClick={onCloseMobile}
                              className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                                  isActive
                                    ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/15'
                                    : 'text-orange-100/75 hover:bg-white/10 hover:text-white'
                                }`
                              }
                            >
                              <ItemIcon size={15} className="flex-shrink-0" />
                              {item.label}
                            </NavLink>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── User + Logout ─────────────────────── */}
      <div className={`border-t border-white/10 pt-3 pb-4 flex-shrink-0 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
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
            collapsed ? 'justify-center px-0' : 'px-3'
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
            className="sidebar-gradient rounded-2xl shadow-2xl min-w-[200px] max-h-[70vh] overflow-y-auto overflow-x-hidden sidebar-scroll"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 text-white/40 sticky top-0 sidebar-gradient"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
            >
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

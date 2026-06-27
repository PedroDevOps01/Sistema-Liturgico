import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { isMembroAuthenticated, getMembroUser } from '../../lib/membroAuth'
import { LayoutDashboard, List, CalendarDays, Gift, User } from 'lucide-react'
import MembroSidebar from './MembroSidebar'
import { NotificacoesProvider } from '../../contexts/NotificacoesContext'

const NAV_ITEMS = [
  { to: '/membro/dashboard',       icon: LayoutDashboard, label: 'Início'      },
  { to: '/membro/escalas',         icon: List,            label: 'Escalas'     },
  { to: '/membro/calendario',      icon: CalendarDays,    label: 'Calendário'  },
  { to: '/membro/aniversariantes', icon: Gift,            label: 'Aniversários'},
  { to: '/membro/perfil',          icon: User,            label: 'Perfil'      },
]

export default function MembroLayout() {
  if (!isMembroAuthenticated()) return <Navigate to="/membro/login" replace />
  const user = getMembroUser()
  const initials = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  return (
    <NotificacoesProvider>
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F5F2EA' }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:block flex-shrink-0" style={{ width: 272 }}>
        <MembroSidebar />
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden sidebar-gradient flex items-center gap-3 px-5 flex-shrink-0"
          style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {user?.foto_base64 ? (
            <img src={user.foto_base64} className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              style={{ boxShadow: '0 0 0 2px #fbbf24' }} alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#431407' }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none truncate">{user?.nome?.split(' ')[0]}</p>
            <p className="text-xs mt-0.5 leading-none text-white/45">Portal do Cerimoniário</p>
          </div>
          {user?.mestre && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24' }}>
              ★ Mestre
            </span>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 72 }}>
          <div className="md:p-6 p-4">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sidebar-gradient fixed bottom-0 left-0 right-0 flex z-50"
          style={{ height: 64, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
              style={({ isActive }) => ({
                color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.38)',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              })}
            >
              <Icon size={20} strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
    </NotificacoesProvider>
  )
}

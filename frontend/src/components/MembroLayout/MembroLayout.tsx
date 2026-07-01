import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { isMembroAuthenticated } from '../../lib/membroAuth'
import { Menu, X } from 'lucide-react'
import MembroSidebar from './MembroSidebar'
import { NotificacoesProvider } from '../../contexts/NotificacoesContext'

export default function MembroLayout() {
  if (!isMembroAuthenticated()) return <Navigate to="/membro/login" replace />

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <NotificacoesProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#F5F2EA' }}>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — desktop */}
        <div className="hidden lg:block flex-shrink-0" style={{ width: 272 }}>
          <MembroSidebar />
        </div>

        {/* Sidebar — mobile slide-in */}
        <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ width: 272 }}>
          <MembroSidebar />
        </div>

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Mobile header */}
          <header className="lg:hidden sidebar-gradient flex items-center gap-3 px-4 flex-shrink-0"
            style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="font-bold text-base text-white flex-1">Portal do Cerimoniário</span>
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </NotificacoesProvider>
  )
}

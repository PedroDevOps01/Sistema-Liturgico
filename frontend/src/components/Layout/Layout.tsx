import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X, Cross } from 'lucide-react'

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/cerimoniarios': 'Cerimoniários',
  '/celebracoes': 'Celebrações',
  '/escalas': 'Escalas',
  '/usuarios': 'Usuários',
  '/telao': 'Telão',
  '/configuracoes': 'Configurações',
}

function getCurrentLabel(pathname: string): string {
  if (pathname.startsWith('/escalas/nova')) return 'Nova Escala'
  if (pathname.match(/^\/escalas\/\d+\/editar$/)) return 'Editar Escala'
  if (pathname.match(/^\/escalas\/\d+$/)) return 'Visualizar Escala'
  return routeLabels[pathname] ?? 'Escala Litúrgica'
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const pageLabel = getCurrentLabel(location.pathname)

  // Update document title on route change
  useEffect(() => {
    document.title = `${pageLabel} · Escala Litúrgica`
  }, [pageLabel])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onCloseMobile={() => setMobileOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-wine-900 text-white shadow-md flex-shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gold-500 rounded-full flex items-center justify-center">
              <Cross size={14} className="text-black" />
            </div>
            <span className="font-bold text-base">{pageLabel}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

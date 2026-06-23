import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatWidget from '../ChatWidget'
import SearchModal from '../SearchModal'
import RelatorioMensalModal from '../RelatorioMensalModal'
import { Menu, X, Search } from 'lucide-react'
import logogrupo from '../../assets/logogrupo.png'

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/cerimoniarios': 'Cerimoniários',
  '/celebracoes': 'Celebrações',
  '/escalas': 'Escalas',
  '/calendario': 'Calendário',
  '/usuarios': 'Usuários',
  '/telao': 'Telão',
  '/configuracoes': 'Configurações',
  '/interessados': 'Interessados',
  '/portal-config': 'Portal Público',
  '/historico': 'Histórico',
  '/treinamentos': 'Treinamentos',
  '/relatorio': 'Relatório',
  '/analytics': 'Analytics',
  '/aniversariantes': 'Aniversariantes',
  '/tunicas': 'Controle de Túnicas',
  '/formacao': 'Formação',
  '/relatorios/frequencia': 'Frequência Individual',
  '/relatorios/crescimento': 'Crescimento do Ministério',
  '/relatorios/treinamentos': 'Presenças em Treinamentos',
  '/relatorios/tunicas': 'Relatório de Empréstimos',
  '/relatorios/assiduidade': 'Assiduidade por Período Litúrgico',
}

function getCurrentLabel(pathname: string): string {
  if (pathname.startsWith('/escalas/nova')) return 'Nova Escala'
  if (pathname.match(/^\/escalas\/\d+\/editar$/)) return 'Editar Escala'
  if (pathname.match(/^\/escalas\/\d+$/)) return 'Visualizar Escala'
  return routeLabels[pathname] ?? 'Ministério dos Acólitos'
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  )
  const location  = useLocation()
  const pageLabel = getCurrentLabel(location.pathname)

  useEffect(() => {
    document.title = `${pageLabel} · Ministério dos Acólitos`
  }, [pageLabel])

  const openSearch = useCallback(() => setSearchOpen(true), [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSearch])

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Desktop */}
      <div
        className={`hidden lg:block flex-shrink-0 isolate transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenSearch={openSearch}
        />
      </div>

      {/* Sidebar — Mobile (full width, no collapse) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 w-64 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          onCloseMobile={() => setMobileOpen(false)}
          onOpenSearch={openSearch}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 text-white shadow-md flex-shrink-0 sidebar-gradient">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center p-1 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            >
              <img src={logogrupo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-base">{pageLabel}</span>
          </div>
          <button
            onClick={openSearch}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Buscar"
          >
            <Search size={20} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      <ChatWidget />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onCloseMenu={() => setMobileOpen(false)} />
      <RelatorioMensalModal />
    </div>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { isAuthenticated } from './lib/auth'
import { applyLiturgicalTheme } from './lib/theme'
import { applyDynamicFavicon } from './lib/favicon'
import logoGrupo from './assets/logogrupo.png'

// Aplica o tema litúrgico antes de qualquer render (sem flash de cor errada)
applyLiturgicalTheme()
applyDynamicFavicon(logoGrupo)

import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cerimoniarios from './pages/Cerimoniarios'
import CerimoniarioDashboard from './pages/CerimoniarioDashboard'
import Celebracoes from './pages/Celebracoes'
import Escalas from './pages/Escalas'
import EscalaForm from './pages/EscalaForm'
import EscalaView from './pages/EscalaView'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'
import Telao from './pages/Telao'
import Calendario from './pages/Calendario'
import Relatorio from './pages/Relatorio'
import Historico from './pages/Historico'
import Treinamentos from './pages/Treinamentos'
import Portal from './pages/Portal'
import PortalConfig from './pages/PortalConfig'
import Confirmar from './pages/Confirmar'
import Interessados from './pages/Interessados'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '15px',
            borderRadius: '12px',
            padding: '12px 16px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#111111', secondary: '#facc15' },
            style: { border: '1px solid #d1fae5', background: '#f0fdf4' },
          },
          error: {
            style: { border: '1px solid #fecaca', background: '#fff1f2' },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/confirmar/:token" element={<Confirmar />} />

        {/* Telão - standalone, no sidebar */}
        <Route
          path="/telao"
          element={
            <PrivateRoute>
              <Telao />
            </PrivateRoute>
          }
        />

        {/* Protected routes with layout */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/cerimoniarios" element={<Cerimoniarios />} />
          <Route path="/cerimoniarios/:id" element={<CerimoniarioDashboard />} />
          <Route path="/celebracoes" element={<Celebracoes />} />
          <Route path="/escalas" element={<Escalas />} />
          <Route path="/escalas/nova" element={<EscalaForm />} />
          <Route path="/escalas/:id" element={<EscalaView />} />
          <Route path="/escalas/:id/editar" element={<EscalaForm />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/relatorio" element={<Relatorio />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/treinamentos" element={<Treinamentos />} />
          <Route path="/portal-config" element={<PortalConfig />} />
          <Route path="/interessados" element={<Interessados />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

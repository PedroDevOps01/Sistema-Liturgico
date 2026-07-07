import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { isAuthenticated } from './lib/auth'
import { applyLiturgicalTheme } from './lib/theme'
import { applyDynamicFavicon } from './lib/favicon'
import logoGrupo from './assets/logogrupo.png'

// Aplica o tema litúrgico antes de qualquer render (sem flash de cor errada)
applyLiturgicalTheme()
applyDynamicFavicon(logoGrupo)

// Dev only: testar a troca de cores no console sem mudar o relógio do sistema.
// Ex: testarTema('2026-12-10') → Advento. testarTema() sem args volta pra hoje.
if (import.meta.env.DEV) {
  (window as unknown as { testarTema: (data?: string) => string }).testarTema = (data?: string) => {
    const periodo = applyLiturgicalTheme(data ? new Date(`${data}T12:00:00`) : undefined)
    console.log(`Tema aplicado: ${periodo}`)
    return periodo
  }
}

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
import Analytics from './pages/Analytics'
import Aniversariantes from './pages/Aniversariantes'
import Tunicas from './pages/Tunicas'
import Formacao from './pages/Formacao'
import RelatorioFrequencia from './pages/RelatorioFrequencia'
import RelatorioCrescimento from './pages/RelatorioCrescimento'
import RelatorioTreinamentos from './pages/RelatorioTreinamentos'
import RelatorioTunicas from './pages/RelatorioTunicas'
import RelatorioAssiduidade from './pages/RelatorioAssiduidade'
import RelatorioAuditoria from './pages/RelatorioAuditoria'
import RelatorioReunioes from './pages/RelatorioReunioes'
import RelatorioParamentados from './pages/RelatorioParamentados'
import { ConfigProvider } from './contexts/ConfigContext'
import Reunioes from './pages/Reunioes'
import Comunicados from './pages/Comunicados'
import Justificativas from './pages/Justificativas'
import MembroLayout from './components/MembroLayout/MembroLayout'
import MembroLogin from './pages/membro/Login'
import MembroDashboard from './pages/membro/Dashboard'
import MembroEscalas from './pages/membro/Escalas'
import MembroCalendario from './pages/membro/Calendario'
import MembroAniversariantes from './pages/membro/Aniversariantes'
import MembroPerfil from './pages/membro/Perfil'
import MembroPresencas from './pages/membro/Presencas'
import MembroComunicados from './pages/membro/Comunicados'
import MembroReunioes from './pages/membro/ReunioesMembro'
import MembroTreinamentos from './pages/membro/TreinamentosMembro'
import MembroContatos from './pages/membro/Contatos'
import MembroEstatisticas from './pages/membro/Estatisticas'
import MembroBloqueioDatas from './pages/membro/BloqueioDatas'
import MembroSubstituicoes from './pages/membro/Substituicoes'
import MembroDocumentos from './pages/membro/Documentos'
import AdminDocumentos from './pages/Documentos'

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

        {/* Portal do Membro (Cerimoniário) */}
        <Route path="/membro/login" element={<MembroLogin />} />
        <Route element={<MembroLayout />}>
          <Route path="/membro/dashboard"      element={<MembroDashboard />} />
          <Route path="/membro/escalas"        element={<MembroEscalas />} />
          <Route path="/membro/calendario"     element={<MembroCalendario />} />
          <Route path="/membro/presencas"        element={<MembroPresencas />} />
          <Route path="/membro/comunicados"      element={<MembroComunicados />} />
          <Route path="/membro/reunioes"         element={<MembroReunioes />} />
          <Route path="/membro/treinamentos"     element={<MembroTreinamentos />} />
          <Route path="/membro/contatos"         element={<MembroContatos />} />
          <Route path="/membro/estatisticas"     element={<MembroEstatisticas />} />
          <Route path="/membro/bloqueio-datas"   element={<MembroBloqueioDatas />} />
          <Route path="/membro/substituicoes"    element={<MembroSubstituicoes />} />
          <Route path="/membro/documentos"       element={<MembroDocumentos />} />
          <Route path="/membro/aniversariantes" element={<MembroAniversariantes />} />
          <Route path="/membro/perfil"         element={<MembroPerfil />} />
        </Route>

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
              <ConfigProvider>
                <Layout />
              </ConfigProvider>
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
          <Route path="/reunioes" element={<Reunioes />} />
          <Route path="/comunicados" element={<Comunicados />} />
          <Route path="/justificativas" element={<Justificativas />} />
          <Route path="/portal-config" element={<PortalConfig />} />
          <Route path="/interessados" element={<Interessados />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/aniversariantes" element={<Aniversariantes />} />
          <Route path="/tunicas" element={<Tunicas />} />
          <Route path="/formacao" element={<Formacao />} />
          <Route path="/relatorios/frequencia" element={<RelatorioFrequencia />} />
          <Route path="/relatorios/crescimento" element={<RelatorioCrescimento />} />
          <Route path="/relatorios/treinamentos" element={<RelatorioTreinamentos />} />
          <Route path="/relatorios/tunicas" element={<RelatorioTunicas />} />
          <Route path="/relatorios/assiduidade" element={<RelatorioAssiduidade />} />
          <Route path="/relatorios/auditoria" element={<RelatorioAuditoria />} />
          <Route path="/relatorios/reunioes" element={<RelatorioReunioes />} />
          <Route path="/relatorios/paramentados" element={<RelatorioParamentados />} />
          <Route path="/documentos" element={<AdminDocumentos />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

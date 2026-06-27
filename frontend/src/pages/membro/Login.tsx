import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2, List, CalendarDays, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { setMembroToken, setMembroUser } from '../../lib/membroAuth'
import type { MembroUser } from '../../lib/membroAuth'
import logoGrupo from '../../assets/logogrupo.png'

const features = [
  { icon: <List size={18} />,        label: 'Minhas Escalas',   desc: 'Veja suas escalas e confirme presença' },
  { icon: <CalendarDays size={18} />, label: 'Calendário',       desc: 'Todas as celebrações do ministério'     },
  { icon: <UserCheck size={18} />,    label: 'Meu Perfil',       desc: 'Atualize seus dados e foto'             },
]

export default function MembroLogin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario.trim() || !password.trim()) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    setError('')
    try {
      const r = await membroApi.post<{ cerimoniario: MembroUser; token: string }>('/login', {
        usuario: usuario.trim(), password,
      })
      setMembroToken(r.data.token)
      setMembroUser(r.data.cerimoniario)
      navigate('/membro/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Usuário ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ════════════════════════════════════════════
          PAINEL ESQUERDO — formulário
      ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto"
           style={{ background: 'linear-gradient(170deg, #fff8f2 0%, #ffffff 55%)' }}>

        {/* Cabeçalho mobile */}
        <div className="lg:hidden sidebar-gradient flex items-center gap-3.5 px-5 py-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <div className="w-full h-full flex items-center justify-center p-1">
              <img src={logoGrupo} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Portal do Cerimoniário</p>
            <p className="text-white/50 text-xs mt-0.5">Ministério dos Acólitos</p>
          </div>
        </div>

        {/* Formulário centralizado */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[400px]">

            {/* Cabeçalho do form */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                   style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-700))' }}>
                <svg width="9" height="9" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="7.5" y="1" width="3" height="16" rx="1.5" fill="currentColor" />
                  <rect x="1" y="6" width="16" height="3" rx="1.5" fill="currentColor" />
                </svg>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Portal do Cerimoniário
                </span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--w-950))' }}>
                Bem-vindo ao portal
              </h2>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                Entre com suas credenciais para acessar o portal
              </p>
            </div>

            {/* Card do formulário */}
            <div className="rounded-3xl p-7"
                 style={{
                   background: 'white',
                   boxShadow: '0 4px 40px rgba(67,20,7,0.09), 0 1px 4px rgba(67,20,7,0.05)',
                   border: '1px solid rgb(var(--w-100))',
                 }}>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {error && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="label">Usuário</label>
                  <input
                    type="text"
                    value={usuario}
                    onChange={e => setUsuario(e.target.value)}
                    placeholder="seu.nome"
                    autoComplete="username"
                    autoFocus
                    disabled={loading}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                      className="input-field pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Padrão: data de nascimento <span className="font-mono">DDMMAAAA</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 font-bold text-sm rounded-2xl btn-primary"
                  style={{ marginTop: '28px' }}
                >
                  {loading ? (
                    <><Loader2 size={17} className="animate-spin" /> Entrando...</>
                  ) : (
                    'Entrar no Portal'
                  )}
                </button>
              </form>
            </div>

            <p className="text-center mt-6 text-gray-400 text-xs">
              Problemas com acesso? Fale com o coordenador.
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          PAINEL DIREITO — identidade visual
      ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] sidebar-gradient relative overflow-hidden flex-col justify-center p-12">

        {/* Cruz arquitetônica decorativa */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <svg viewBox="0 0 400 600" fill="none"
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.055 }}>
            <rect x="168" y="0" width="64" height="600" fill="white" rx="8" />
            <rect x="0" y="200" width="400" height="64" fill="white" rx="8" />
          </svg>
        </div>

        {/* Halo difuso */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 42%, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          {/* Logo do grupo */}
          <div>
            <div className="w-28 h-28 rounded-full mx-auto mb-6 overflow-hidden flex items-end justify-center"
                 style={{
                   background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                   boxShadow: '0 16px 56px rgba(0,0,0,0.45), 0 0 0 3px rgba(255,255,255,0.14)',
                 }}>
              <img src={logoGrupo} alt="Ministério dos Acólitos"
                   className="w-[95%] h-[129%] object-contain object-top" />
            </div>

            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Portal do Cerimoniário
            </h1>
            <p className="text-white/50 text-sm mt-1 font-medium">
              Ministério dos Acólitos
            </p>
          </div>

          {/* Mote */}
          <div className="px-7 py-3.5 rounded-2xl"
               style={{
                 background: 'rgba(255,255,255,0.08)',
                 border: '1px solid rgba(255,255,255,0.14)',
                 backdropFilter: 'blur(8px)',
               }}>
            <p style={{
              color: '#fbbf24',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              textShadow: '0 1px 12px rgba(251,191,36,0.35)',
            }}>
              Antes morrer do que pecar
            </p>
          </div>

          {/* Cards de funcionalidades */}
          <div className="w-full max-w-sm flex flex-col gap-3">
            {features.map(f => (
              <div key={f.label}
                   className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left"
                   style={{
                     background: 'rgba(255,255,255,0.07)',
                     border: '1px solid rgba(255,255,255,0.10)',
                     backdropFilter: 'blur(6px)',
                   }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">{f.label}</p>
                  <p className="text-white/45 text-xs mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

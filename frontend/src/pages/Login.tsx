import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2, Calendar, Users, BarChart2 } from 'lucide-react'
import api from '../lib/api'
import { setToken, setUser } from '../lib/auth'
import logoGrupo from '../assets/logogrupo.png'

const schema = z.object({
  usuario: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>
type Status = 'idle' | 'loading' | 'success' | 'error'

const features = [
  {
    icon: <Users size={18} />,
    label: 'Cerimoniários',
    desc: 'Perfis, disponibilidade e histórico completo',
  },
  {
    icon: <Calendar size={18} />,
    label: 'Escalas & Celebrações',
    desc: 'Organize missas e eventos litúrgicos',
  },
  {
    icon: <BarChart2 size={18} />,
    label: 'Relatórios',
    desc: 'Frequência, assiduidade e crescimento',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [successName, setSuccessName] = useState('')

  useEffect(() => { document.title = 'Login · Ministério dos Acólitos' }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setStatus('loading')
    setErrorMessage('')
    try {
      const response = await api.post('/login', data)
      const { token, user } = response.data as {
        token: string
        user: { id: number; nome: string; usuario: string; ativo: boolean }
      }
      setToken(token)
      setUser(user)
      setSuccessName(user.nome)
      setStatus('success')
      setTimeout(() => navigate('/', { replace: true }), 1000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const msg =
        error.response?.data?.errors?.usuario?.[0] ||
        error.response?.data?.message ||
        'Usuário ou senha incorretos.'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen flex">

      {/* ── Overlay pós-login ── */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center sidebar-gradient animate-fade-in">
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 128 128" fill="none"
                   style={{ animationDuration: '1.4s' }}>
                <circle cx="64" cy="64" r="60" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <path d="M64 4 A60 60 0 0 1 124 64" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden flex items-end justify-center"
                   style={{
                     background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                     boxShadow: '0 0 0 4px rgba(255,255,255,0.15), 0 16px 48px rgba(0,0,0,0.4)',
                   }}>
                <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs font-bold tracking-[0.22em] uppercase mb-2">
                Antes morrer do que pecar
              </p>
              <h2 className="text-white text-2xl font-extrabold drop-shadow mb-1">
                Bem-vindo, {successName}!
              </h2>
              <p className="text-white/50 text-sm">Preparando o painel...</p>
            </div>
            <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full rounded-full"
                   style={{ background: 'white', animation: 'progress-bar 1s ease-out forwards' }} />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PAINEL ESQUERDO — identidade visual
      ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden sidebar-gradient flex-col justify-between p-12">

        {/* Cruz arquitetônica — risco estético: ocupa o fundo inteiro como estrutura */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <svg viewBox="0 0 400 600" fill="none"
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.055 }}>
            <rect x="168" y="0" width="64" height="600" fill="white" rx="8" />
            <rect x="0" y="200" width="400" height="64" fill="white" rx="8" />
          </svg>
        </div>

        {/* Halo difuso no centro */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 42%, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />

        {/* Conteúdo principal */}
        <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center gap-10">

          {/* Logo */}
          <div>
            <div className="w-36 h-36 rounded-full mx-auto mb-6 overflow-hidden flex items-end justify-center"
                 style={{
                   background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                   boxShadow: '0 16px 56px rgba(0,0,0,0.45), 0 0 0 3px rgba(255,255,255,0.14)',
                 }}>
              <img src={logoGrupo} alt="São Domingos Sávio"
                   className="w-[95%] h-[129%] object-contain object-top" />
            </div>

            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Ministério dos Acólitos
            </h1>
            <p className="text-white/50 text-sm mt-1 font-medium">
              Paróquia São José Operário · Araturi
            </p>
          </div>

          {/* Mote — tratamento tipográfico de inscrição */}
          <div className="px-7 py-3.5 rounded-2xl"
               style={{
                 background: 'rgba(255,255,255,0.08)',
                 border: '1px solid rgba(255,255,255,0.14)',
                 backdropFilter: 'blur(8px)',
               }}>
            <p style={{
              color: '#f59e0b',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              textShadow: '0 1px 12px rgba(245,158,11,0.35)',
            }}>
              Antes morrer do que pecar
            </p>
          </div>

          {/* Cards de funcionalidades */}
          <div className="w-full max-w-sm flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.label}
                   className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left"
                   style={{
                     background: 'rgba(255,255,255,0.07)',
                     border: '1px solid rgba(255,255,255,0.10)',
                     backdropFilter: 'blur(6px)',
                   }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
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

        {/* Rodapé */}
        <p className="relative z-10 text-center text-white/20 text-xs font-medium">
          © {new Date().getFullYear()} Sistema de Gestão Litúrgica
        </p>
      </div>

      {/* ════════════════════════════════════════════
          PAINEL DIREITO — formulário
      ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto"
           style={{ background: 'linear-gradient(170deg, #fff8f2 0%, #ffffff 55%)' }}>

        {/* Cabeçalho mobile — visível só em telas pequenas */}
        <div className="lg:hidden sidebar-gradient flex items-center gap-3.5 px-5 py-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-end justify-center flex-shrink-0"
               style={{
                 background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
               }}>
            <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Ministério dos Acólitos</p>
            <p className="text-white/50 text-xs mt-0.5">Paróquia São José Operário</p>
          </div>
        </div>

        {/* Formulário centralizado */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[400px] animate-fade-in">

            {/* Cabeçalho do form */}
            <div className="mb-8">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                   style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-700))' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Acesso restrito
                </span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--w-950))' }}>
                Bem-vindo de volta
              </h2>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {/* Card do formulário */}
            <div className="rounded-3xl p-7"
                 style={{
                   background: 'white',
                   boxShadow: '0 4px 40px rgba(67,20,7,0.09), 0 1px 4px rgba(67,20,7,0.05)',
                   border: '1px solid rgb(var(--w-100))',
                 }}>

              {!isSuccess && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                  {status === 'error' && errorMessage && (
                    <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 animate-fade-in">
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div>
                    <label className="label">Usuário</label>
                    <input
                      {...register('usuario')}
                      type="text"
                      placeholder="Seu nome de usuário"
                      className={`input-field ${errors.usuario || status === 'error' ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                      autoComplete="username"
                      autoFocus
                      disabled={isLoading}
                    />
                    {errors.usuario && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors.usuario.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        className={`input-field pr-12 ${errors.password || status === 'error' ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                        autoComplete="current-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 text-white font-bold text-sm rounded-2xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 btn-primary"
                    style={{ marginTop: '28px' }}
                  >
                    {isLoading ? (
                      <><Loader2 size={17} className="animate-spin" /> Entrando...</>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Rodapé */}
            <p className="text-center mt-8 text-gray-400 text-xs">
              © {new Date().getFullYear()} Ministério dos Acólitos · Sistema de Gestão
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

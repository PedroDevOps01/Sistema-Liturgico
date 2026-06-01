import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { setToken, setUser } from '../lib/auth'
import logoGrupo from '../assets/logogrupo.png'

const schema = z.object({
  usuario: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>
type Status = 'idle' | 'loading' | 'success' | 'error'

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
        'Credenciais inválidas. Verifique usuário e senha.'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen flex">

      {/* ── Overlay de loading pós-login ── */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center sidebar-gradient animate-fade-in">
          <div className="flex flex-col items-center gap-8">
            {/* Logo animada */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden flex items-end justify-center"
                   style={{
                     background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                     boxShadow: '0 0 0 4px rgba(255,255,255,0.15), 0 16px 48px rgba(0,0,0,0.4)',
                   }}>
                <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
              </div>
              {/* Anel giratório */}
              <svg className="absolute -inset-2 animate-spin" style={{ animationDuration: '1.4s' }}
                   width="128" height="128" viewBox="0 0 128 128" fill="none">
                <circle cx="64" cy="64" r="60" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <path d="M64 4 A60 60 0 0 1 124 64" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>

            {/* Texto */}
            <div className="text-center">
              <p className="text-white/50 text-xs font-bold tracking-[0.22em] uppercase mb-2">
                Antes morrer do que pecar
              </p>
              <h2 className="text-white text-2xl font-extrabold drop-shadow mb-1">
                Bem-vindo, {successName}!
              </h2>
              <p className="text-white/50 text-sm">Preparando o painel...</p>
            </div>

            {/* Barra de progresso */}
            <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full rounded-full animate-progress"
                   style={{ background: 'white', animation: 'progress-bar 1s ease-out forwards' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Painel esquerdo ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden sidebar-gradient flex-col items-center justify-center p-12">

        {/* Círculos decorativos de fundo */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, rgb(var(--w-200)), transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, rgb(var(--w-300)), transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, rgb(var(--w-100)), transparent 60%)' }} />

        {/* Cruz decorativa grande no centro-fundo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <svg width="340" height="340" viewBox="0 0 24 24" fill="none" className="opacity-[0.04]">
            <path d="M12 2v20M2 12h20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Logo do grupo */}
          <div className="w-44 h-44 rounded-full mb-7 overflow-hidden flex items-end justify-center"
               style={{
                 background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-500)) 45%, rgb(var(--w-700)) 100%)',
                 boxShadow: '0 12px 48px rgba(0,0,0,0.40), 0 0 0 4px rgba(255,255,255,0.12)',
               }}>
            <img
              src={logoGrupo}
              alt="São Domingos Sávio"
              className="w-[95%] h-[129%] object-contain object-top"
            />
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
            Ministério dos Acólitos
          </h1>

          {/* Frase em destaque */}
          <div className="mb-12 px-6 py-3 rounded-2xl"
               style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
            <p className="text-white font-bold tracking-[0.18em] uppercase text-sm drop-shadow">
              Antes morrer do que pecar
            </p>
          </div>

          {/* Destaques */}
          {/* <div className="flex flex-col gap-4 w-full">
            {[
              { icon: '✝', label: 'Gestão de Escalas', desc: 'Organize celebrações com eficiência' },
              { icon: '👥', label: 'Cerimoniários', desc: 'Controle total da equipe litúrgica' },
              { icon: '📅', label: 'Calendário', desc: 'Visualize o calendário litúrgico' },
            ].map(item => (
              <div key={item.label}
                   className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left"
                   style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-white/50 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div> */}
        </div>

        {/* Rodapé esquerdo */}
        <p className="absolute bottom-6 text-white/25 font-bold text-xs">
          © {new Date().getFullYear()} Paróquia São José Operário · Araturi
        </p>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden"
           style={{ background: 'linear-gradient(160deg, #fff7ed 0%, #ffffff 60%)' }}>

        {/* Mancha decorativa de fundo */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgb(var(--w-100)) 0%, transparent 70%)', opacity: 0.6 }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgb(var(--w-50)) 0%, transparent 70%)', opacity: 0.8 }} />

        <div className="relative z-10 w-full max-w-[400px]">

          {/* Cabeçalho do form */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-semibold tracking-widest uppercase"
                 style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-700))' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
              Acesso ao sistema
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--w-950))' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-gray-400 text-sm mt-1.5">Insira suas credenciais para continuar</p>
          </div>

          {/* Card com o form */}
          <div className="rounded-2xl p-7"
               style={{ background: 'white', boxShadow: '0 4px 32px rgb(var(--w-900) / 0.08), 0 1px 4px rgb(var(--w-900) / 0.04)', border: '1px solid rgb(var(--w-100))' }}>

            {isSuccess ? null : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {status === 'error' && errorMessage && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="label">Usuário</label>
                  <input
                    {...register('usuario')}
                    type="text"
                    placeholder="Ex: master"
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
                      placeholder="Digite sua senha"
                      className={`input-field pr-12 ${errors.password || status === 'error' ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                      tabIndex={-1}
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
                  className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold text-base rounded-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 btn-primary"
                >
                  {isLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                  ) : (
                    <><LogIn size={18} /> Entrar</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Rodapé */}
          <p className="text-center mt-8 text-gray-600 font-bold text-xs">
            © {new Date().getFullYear()} Ministério dos Acólitos · Sistema de Gestão
          </p>
        </div>
      </div>

    </div>
  )
}

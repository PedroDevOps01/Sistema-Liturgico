import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { setToken, setUser } from '../lib/auth'

const schema = z.object({
  usuario: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { document.title = 'Login · Escala Litúrgica' }, [])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [successName, setSuccessName] = useState('')

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

      // Show success state briefly then navigate (no page reload = no blank screen)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1000)
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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #431407 0%, #7c2d12 35%, #c2410c 65%, #f97316 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-xl shadow-orange-900/30"
               style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M2 12h20" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Escala Litúrgica</h1>
          <p className="text-orange-200/70 mt-1 text-sm">Sistema de Gestão Litúrgica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl overflow-hidden"
             style={{ boxShadow: '0 20px 60px rgba(67, 20, 7, 0.4)' }}>

          {/* Success state */}
          {isSuccess ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bem-vindo, {successName}!</h2>
              <p className="text-gray-500 text-sm mb-4">Login realizado com sucesso.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Redirecionando para o painel...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" noValidate>
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Entrar na sua conta</h2>
                <p className="text-sm text-gray-500 mt-0.5">Use seu usuário e senha cadastrados</p>
              </div>

              {/* Error banner */}
              {status === 'error' && errorMessage && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Usuário */}
              <div>
                <label className="label">Usuário</label>
                <input
                  {...register('usuario')}
                  type="text"
                  placeholder="Ex: master"
                  className={`input-field ${errors.usuario || status === 'error' ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                />
                {errors.usuario && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.usuario.message}
                  </p>
                )}
              </div>

              {/* Senha */}
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    className={`input-field pr-12 ${errors.password || status === 'error' ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold text-base rounded-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 mt-2 btn-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Entrar
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-orange-200/50 text-xs">
          © {new Date().getFullYear()} Escala Litúrgica · Sistema de Gestão
        </p>
      </div>
    </div>
  )
}

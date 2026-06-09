import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import logoGrupo from '../assets/logogrupo.png'

interface ConfirmarData {
  cerimoniario: string
  funcao: string
  data: string
  horario: string
  periodo_liturgico: string
  status_confirmacao: 'confirmado' | 'recusado' | null
}

export default function Confirmar() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]         = useState<ConfirmarData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [enviando, setEnviando] = useState<'confirmar' | 'recusar' | null>(null)
  const [status, setStatus]     = useState<'confirmado' | 'recusado' | null>(null)
  const [respondido, setRespondido] = useState(false)
  const [erro, setErro]         = useState(false)

  useEffect(() => {
    fetch(`/api/confirmar/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(r => {
        setData(r.data)
        if (r.data.status_confirmacao) {
          setStatus(r.data.status_confirmacao)
          setRespondido(true)
        }
      })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [token])

  async function responder(acao: 'confirmar' | 'recusar') {
    setEnviando(acao)
    try {
      const r = await fetch(`/api/confirmar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      if (!r.ok) throw new Error()
      const res = await r.json()
      setStatus(res.data.status_confirmacao)
      setRespondido(true)
    } catch {
      alert('Erro ao registrar resposta. Tente novamente.')
    } finally {
      setEnviando(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <img src={logoGrupo} alt="Logo" className="h-14 w-14 rounded-2xl shadow-md mb-6" />

      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-xl">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Carregando...</div>
        ) : erro ? (
          <div className="p-10 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-amber-500" />
            <p className="font-semibold text-gray-700">Link inválido ou expirado</p>
            <p className="mt-1 text-sm text-gray-400">Este link de confirmação não é válido.</p>
          </div>
        ) : (
          <div className="p-8">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-600">
              Ministério dos Acólitos
            </p>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">
              Olá, {data?.cerimoniario}!
            </h1>
            <p className="mb-6 text-sm text-gray-500">Você foi escalado para servir.</p>

            {/* Detalhes da escala */}
            <div className="mb-6 space-y-2 rounded-2xl bg-gray-50 p-4">
              {[
                ['Função',     data?.funcao],
                ['Data',       data?.data],
                ['Horário',    data?.horario],
                ['Celebração', data?.periodo_liturgico],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            {respondido ? (
              <div className={`rounded-2xl p-5 text-center ${
                status === 'confirmado'
                  ? 'border border-green-200 bg-green-50'
                  : 'border border-red-200 bg-red-50'
              }`}>
                {status === 'confirmado' ? (
                  <>
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-800">Presença confirmada!</p>
                    <p className="mt-1 text-sm text-green-600">Que Deus abençoe seu serviço.</p>
                  </>
                ) : (
                  <>
                    <XCircle size={32} className="mx-auto mb-2 text-red-500" />
                    <p className="font-semibold text-red-800">Recusa registrada.</p>
                    <p className="mt-1 text-sm text-red-600">A coordenação foi notificada.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="mb-3 text-center text-sm text-gray-500">Você poderá comparecer?</p>
                <button
                  onClick={() => responder('confirmar')}
                  disabled={!!enviando}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3.5 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />
                  {enviando === 'confirmar' ? 'Confirmando...' : 'Confirmar presença'}
                </button>
                <button
                  onClick={() => responder('recusar')}
                  disabled={!!enviando}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 py-3.5 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  <XCircle size={18} />
                  {enviando === 'recusar' ? 'Registrando...' : 'Não poderei comparecer'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400">Ministério dos Acólitos</p>
    </div>
  )
}

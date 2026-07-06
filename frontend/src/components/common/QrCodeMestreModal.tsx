import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, RefreshCw, ShieldCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface Props {
  escalaId: number | null
  onClose: () => void
}

export default function QrCodeMestreModal({ escalaId, onClose }: Props) {
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // onClose muda de referência a cada render do pai — usar ref evita refetch em loop.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const carregar = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const r = await membroApi.get<{ qrcode: string }>(`/escalas/${id}/qrcode-presenca`)
      setQrcode(r.data.qrcode)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao gerar código de presença')
      onCloseRef.current()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQrcode(null)
    if (escalaId) carregar(escalaId)
  }, [escalaId, carregar])

  if (!escalaId) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 9999 }}
    >
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <ShieldCheck size={16} style={{ color: '#d97706' }} />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">Código de presença</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 flex flex-col items-center gap-4">
          {loading ? (
            <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          ) : qrcode ? (
            <>
              <div className="p-3 rounded-xl border border-gray-100 bg-white">
                <QRCodeSVG value={qrcode} size={220} />
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(qrcode); toast.success('Código copiado!') }}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                <Copy size={11} />
                {qrcode}
              </button>
            </>
          ) : null}
          <p className="text-xs text-gray-500 text-center">
            Mostre esta tela para cada acólito escanear no próprio celular, no momento de marcar que serviu.
          </p>
          <button onClick={() => escalaId && carregar(escalaId)} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            style={{ color: DARK, background: '#F3F4F6' }}>
            <RefreshCw size={12} />
            Atualizar código
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

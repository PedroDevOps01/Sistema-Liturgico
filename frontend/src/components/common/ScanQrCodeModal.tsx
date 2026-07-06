import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Keyboard, ScanLine, X } from 'lucide-react'

const GOLD = '#fbbf24'
const DARK = '#431407'

const ELEMENT_ID = 'scan-qrcode-reader'

interface Props {
  isOpen: boolean
  onScan: (decodedText: string) => void
  onCancel: () => void
}

export default function ScanQrCodeModal({ isOpen, onScan, onCancel }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [codigoDigitado, setCodigoDigitado] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setManual(false)
    setCodigoDigitado('')
    setErro(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || manual) return

    const scanner = new Html5Qrcode(ELEMENT_ID)
    let ativo = true

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 230 },
      (decodedText) => {
        if (!ativo) return
        ativo = false
        onScan(decodedText)
      },
      () => {},
    ).catch(() => setErro('Não foi possível acessar a câmera. Verifique a permissão do navegador.'))

    return () => {
      ativo = false
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, manual])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 9999 }}
    >
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <ScanLine size={16} style={{ color: '#d97706' }} />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">Escanear código de presença</h2>
          </div>
          <button onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {manual ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={codigoDigitado}
                onChange={e => setCodigoDigitado(e.target.value)}
                placeholder="Ex: ESCALA-11-a1b2c3d4e5f6"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
              <button
                onClick={() => codigoDigitado.trim() && onScan(codigoDigitado.trim())}
                disabled={!codigoDigitado.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: GOLD, color: DARK }}>
                Confirmar código
              </button>
            </div>
          ) : erro ? (
            <p className="text-sm text-red-500 text-center py-10">{erro}</p>
          ) : (
            <div id={ELEMENT_ID} className="rounded-xl overflow-hidden bg-black" />
          )}

          <p className="text-xs text-gray-400 text-center">
            {manual
              ? 'Digite exatamente o código exibido na tela do mestre.'
              : 'Peça ao mestre da escala para exibir o código de presença na tela dele e aponte a câmera.'}
          </p>

          <button
            onClick={() => setManual(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold mx-auto text-gray-400 hover:text-gray-600 transition-colors">
            <Keyboard size={12} />
            {manual ? 'Usar a câmera' : 'Não consegue escanear? Digite o código'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

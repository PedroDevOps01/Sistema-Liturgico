import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, X } from 'lucide-react'

const GOLD = '#fbbf24'
const DARK = '#431407'

interface Props {
  isOpen: boolean
  loading?: boolean
  onConfirm: (observacao: string) => void
  onCancel: () => void
}

export default function JustificativaModal({ isOpen, loading, onConfirm, onCancel }: Props) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTexto('')
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleConfirm() {
    onConfirm(texto.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 9999 }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${GOLD}20` }}>
              <AlertCircle size={16} style={{ color: '#d97706' }} />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">Justificar falta</h2>
          </div>
          <button onClick={onCancel} disabled={loading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">
            Descreva brevemente o motivo da falta <span className="text-gray-400">(opcional)</span>
          </p>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            disabled={loading}
            maxLength={500}
            rows={3}
            placeholder="Ex: Compromisso de trabalho, viagem..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-none outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-60 transition-all"
          />
          <p className="text-[10px] text-gray-300 text-right">{texto.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ background: GOLD, color: DARK, boxShadow: '0 4px 12px rgba(251,191,36,0.3)' }}>
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

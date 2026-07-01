import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-gold-500 hover:bg-gold-600 text-black'

  const iconBg = variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-amber-600'

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Body */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <AlertTriangle className={iconColor} size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-200 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl font-semibold transition-all duration-200 text-sm ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

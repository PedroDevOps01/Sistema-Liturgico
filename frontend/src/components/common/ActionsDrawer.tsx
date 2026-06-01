import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface DrawerAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
  separator?: boolean // linha separadora antes desta ação
}

interface ActionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  actions: DrawerAction[]
}

export default function ActionsDrawer({ isOpen, onClose, title, subtitle, actions }: ActionsDrawerProps) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="sidebar-gradient px-5 py-4 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="font-bold text-white text-base leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-white/60 text-xs mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {actions.map((action, i) => (
            <div key={i}>
              {action.separator && (
                <div className="border-t border-gray-100 my-2" />
              )}
              <button
                disabled={action.disabled}
                onClick={() => {
                  if (!action.disabled) {
                    action.onClick()
                    onClose()
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-left transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                  action.variant === 'danger'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : action.variant === 'success'
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : action.variant === 'warning'
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-gray-50 text-gray-800 hover:bg-wine-50 hover:text-wine-900'
                }`}
              >
                <span className="flex-shrink-0 opacity-80">{action.icon}</span>
                <span className="text-sm">{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

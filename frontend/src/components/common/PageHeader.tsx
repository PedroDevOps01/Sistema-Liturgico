import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-5 border-b border-gray-200 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-1 h-10 rounded-full flex-shrink-0"
             style={{ background: 'linear-gradient(180deg, var(--theme-btn-to) 0%, var(--theme-btn-from) 100%)' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">{action}</div>
      )}
    </div>
  )
}

import { EyeOff, Eye } from 'lucide-react'

interface InativosToggleProps {
  mostrarInativos: boolean
  onChange: (v: boolean) => void
  count?: number
}

export default function InativosToggle({ mostrarInativos, onChange, count }: InativosToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!mostrarInativos)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
        mostrarInativos
          ? 'bg-wine-900 text-white border-wine-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-wine-300 hover:text-wine-700'
      }`}
    >
      {mostrarInativos ? <Eye size={15} /> : <EyeOff size={15} />}
      <span className="hidden sm:inline">Inativos</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${mostrarInativos ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

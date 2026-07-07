import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  subLabel?: string
  status?: 'available' | 'busy' | 'unavailable' | 'conflict'
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string | number | null
  onChange: (value: string | number | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Altura estimada do dropdown (busca + lista), usada para decidir se abre pra cima ou pra baixo
const DROPDOWN_HEIGHT = 300

function StatusDot({ status }: { status?: SelectOption['status'] }) {
  if (!status) return null
  const cls =
    status === 'available'
      ? 'bg-green-500'
      : status === 'busy'
      ? 'bg-amber-400'
      : status === 'conflict'
      ? 'bg-orange-500'
      : 'bg-red-500'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cls}`} />
}

interface Coords {
  left: number
  width: number
  top?: number
  bottom?: number
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— Selecionar —',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.subLabel ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < DROPDOWN_HEIGHT && rect.top > spaceBelow

    setCoords(
      openUp
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4 }
        : { left: rect.left, width: rect.width, top: rect.bottom + 4 }
    )
  }

  // Posiciona o dropdown (portal em document.body) sempre que abrir, e acompanha scroll/resize
  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  // Close on outside click (considera clique tanto no trigger quanto no dropdown portalizado)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  function handleSelect(opt: SelectOption) {
    onChange(opt.value)
    setOpen(false)
    setSearch('')
  }

  function handleClear() {
    onChange(undefined)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-wine-600 focus:ring-1 focus:ring-wine-600/20 bg-white transition-all text-left flex items-center gap-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <StatusDot status={selected.status} />
            <span className="truncate text-gray-900">{selected.label}</span>
            {selected.subLabel && (
              <span className="text-xs text-gray-400 flex-shrink-0">{selected.subLabel}</span>
            )}
          </span>
        ) : (
          <span className="flex-1 text-gray-400 truncate">{placeholder}</span>
        )}
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — portalizado em document.body para nunca ficar cortado por overflow/z-index de ancestrais */}
      {open && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: coords.left,
            width: Math.max(coords.width, 200),
            top: coords.top,
            bottom: coords.bottom,
          }}
          className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wine-600 bg-gray-50"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* Clear option */}
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="inline-block w-2.5 h-2.5 flex-shrink-0" />
              {placeholder}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">Nenhum resultado</div>
            ) : (
              filtered.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-wine-50 flex items-start gap-2 transition-colors ${
                    opt.value === value ? 'bg-wine-50 text-wine-900 font-semibold' : 'text-gray-800'
                  }`}
                >
                  <span className="mt-0.5">
                    <StatusDot status={opt.status} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">
                      {opt.label}
                      {opt.status === 'conflict' && (
                        <span className="ml-1 text-orange-500 text-xs">⚠️</span>
                      )}
                    </span>
                    {opt.subLabel && (
                      <span
                        className={`block text-xs mt-0.5 ${
                          opt.status === 'available'
                            ? 'text-green-600'
                            : opt.status === 'busy'
                            ? 'text-amber-600'
                            : opt.status === 'conflict'
                            ? 'text-orange-500'
                            : opt.status === 'unavailable'
                            ? 'text-red-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {opt.subLabel}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

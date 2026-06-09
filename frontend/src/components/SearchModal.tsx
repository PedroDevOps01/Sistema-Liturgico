import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Calendar, ClipboardList, X } from 'lucide-react'
import api from '../lib/api'

interface SearchResult {
  tipo: 'cerimoniario' | 'celebracao' | 'escala'
  id: number
  titulo: string
  subtitulo: string
  url: string
}

interface SearchData {
  cerimoniarios: SearchResult[]
  celebracoes: SearchResult[]
  escalas: SearchResult[]
}

const TIPO_ICON = {
  cerimoniario: <Users size={14} />,
  celebracao:   <Calendar size={14} />,
  escala:       <ClipboardList size={14} />,
}

const TIPO_COLOR = {
  cerimoniario: 'bg-amber-100 text-amber-700',
  celebracao:   'bg-blue-100 text-blue-700',
  escala:       'bg-emerald-100 text-emerald-700',
}

const TIPO_LABEL = {
  cerimoniario: 'Acólito',
  celebracao:   'Celebração',
  escala:       'Escala',
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor]   = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery(''); setResults(null); setCursor(-1)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults(null); setCursor(-1); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await api.get<{ data: SearchData }>(`/busca?q=${encodeURIComponent(query)}`)
        setResults(r.data.data)
        setCursor(-1)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const allResults: SearchResult[] = results
    ? [...(results.cerimoniarios ?? []), ...(results.celebracoes ?? []), ...(results.escalas ?? [])]
    : []

  function go(url: string) { navigate(url); onClose() }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)) }
    if (e.key === 'Enter' && cursor >= 0 && allResults[cursor]) go(allResults[cursor].url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search size={18} className="flex-shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar acólito, celebração, escala..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults(null) }} className="text-gray-300 hover:text-gray-500">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              Buscando...
            </div>
          )}

          {!loading && query.length >= 2 && allResults.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              Nenhum resultado para "{query}"
            </div>
          )}

          {!loading && allResults.length > 0 && (
            <div className="py-1.5">
              {allResults.map((r, i) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => go(r.url)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    cursor === i ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${TIPO_COLOR[r.tipo]}`}>
                    {TIPO_ICON[r.tipo]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.titulo}</p>
                    <p className="truncate text-xs text-gray-400">{TIPO_LABEL[r.tipo]} · {r.subtitulo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="py-10 text-center">
              <Search size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Digite para buscar</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-400">
          <span>↑↓ navegar</span>
          <span>Enter selecionar · Esc fechar</span>
        </div>
      </div>
    </div>
  )
}

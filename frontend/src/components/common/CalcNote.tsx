import { Info } from 'lucide-react'

export interface CalcItem {
  label: string
  formula: string
  note: string
}

export default function CalcNote({ items }: { items: CalcItem[] }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-100 rounded-xl">
      <Info size={15} className="mt-0.5 flex-shrink-0 text-sky-400" />
      <div className="space-y-2 text-xs text-sky-900 leading-relaxed">
        {items.map((item, i) => (
          <div key={i}>
            <span className="font-semibold">{item.label}:</span>{' '}
            <code className="font-mono bg-sky-100/80 px-1.5 py-0.5 rounded text-sky-800 font-semibold">
              {item.formula}
            </code>
            {' — '}
            <span className="text-sky-700">{item.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

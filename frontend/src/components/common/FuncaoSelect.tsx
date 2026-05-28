interface FuncaoSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  id?: string
  className?: string
}

export default function FuncaoSelect({
  value,
  onChange,
  options,
  placeholder = 'Função...',
  id,
  className = '',
}: FuncaoSelectProps) {
  const listId = id ? `funcao-datalist-${id}` : 'funcao-datalist'
  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-wine-900 focus:ring-2 focus:ring-wine-900/10 bg-white transition-all ${className}`}
      />
      <datalist id={listId}>
        {options.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  )
}

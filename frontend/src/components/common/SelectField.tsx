import { Check, ChevronDown } from 'lucide-react'
import { Children, forwardRef, isValidElement, useEffect, useRef, useState } from 'react'

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'wine' | 'amber'
  wrapperClassName?: string
}

interface OptionItem {
  value: string
  label: string
  disabled?: boolean
}

function nodeToString(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToString).join('')
  return ''
}

function parseOptions(children: React.ReactNode): OptionItem[] {
  const items: OptionItem[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const p = child.props as Record<string, unknown>
    if (child.type === 'option') {
      items.push({
        value: String(p.value ?? ''),
        label: nodeToString(p.children) || String(p.value ?? ''),
        disabled: Boolean(p.disabled),
      })
    } else if (child.type === 'optgroup') {
      parseOptions(p.children as React.ReactNode).forEach((i) => items.push(i))
    }
  })
  return items
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      className = '',
      variant = 'wine',
      wrapperClassName = '',
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      name,
      ...props
    },
    ref
  ) => {
    const items = parseOptions(children)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const hiddenSelectRef = useRef<HTMLSelectElement>(null)

    const [localValue, setLocalValue] = useState(String(value ?? defaultValue ?? ''))
    const [open, setOpen] = useState(false)

    // Controlled: keep in sync with value prop
    useEffect(() => {
      if (value !== undefined) setLocalValue(String(value))
    }, [value])

    // Uncontrolled: react-hook-form sets element.value via ref callback after mount;
    // read that value once so the trigger shows the correct default (e.g. edit modal)
    useEffect(() => {
      if (value !== undefined) return
      const domVal = hiddenSelectRef.current?.value
      if (domVal && domVal !== localValue) setLocalValue(domVal)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const selectedItem = items.find((i) => i.value === localValue)

    function handleSelect(val: string) {
      setLocalValue(val)
      setOpen(false)
      if (onChange) {
        const event = {
          target: { value: val, name: name ?? '' },
          currentTarget: { value: val, name: name ?? '' },
          nativeEvent: new Event('change'),
          bubbles: true, cancelable: false, defaultPrevented: false,
          eventPhase: 0, isTrusted: false,
          preventDefault: () => {}, isDefaultPrevented: () => false,
          stopPropagation: () => {}, isPropagationStopped: () => false,
          persist: () => {}, timeStamp: Date.now(), type: 'change',
        } as unknown as React.ChangeEvent<HTMLSelectElement>
        onChange(event)
      }
    }

    function handleBlur() {
      setOpen(false)
      if (onBlur) {
        const event = { target: { name: name ?? '' } } as unknown as React.FocusEvent<HTMLSelectElement>
        onBlur(event)
      }
    }

    useEffect(() => {
      if (!open) return
      function onOutside(e: MouseEvent) {
        if (!wrapperRef.current?.contains(e.target as Node)) handleBlur()
      }
      document.addEventListener('mousedown', onOutside)
      return () => document.removeEventListener('mousedown', onOutside)
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const vs =
      variant === 'amber'
        ? {
            trigger: 'border-amber-200 hover:border-amber-300 focus:border-amber-400 focus:ring-amber-400/15 text-gray-700',
            active: 'border-amber-400 ring-2 ring-amber-400/15',
            icon: 'text-amber-500',
            sel: 'bg-amber-50 text-amber-900',
            check: 'text-amber-600',
            hover: 'hover:bg-amber-50/60',
          }
        : {
            trigger: 'border-wine-100 hover:border-wine-300 focus:border-wine-500 focus:ring-wine-500/15 text-gray-800',
            active: 'border-wine-400 ring-2 ring-wine-500/15',
            icon: 'text-wine-500',
            sel: 'bg-wine-50 text-wine-900',
            check: 'text-wine-600',
            hover: 'hover:bg-wine-50/60',
          }

    return (
      <div ref={wrapperRef} className={`relative ${wrapperClassName}`}>
        {/* Hidden native select — react-hook-form reads value via ref */}
        <select
          ref={(node) => {
            hiddenSelectRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node
          }}
          name={name}
          value={localValue}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          disabled={disabled}
          {...props}
        >
          {children}
        </select>

        {/* Visible trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={[
            'w-full px-4 py-2.5 pr-10 border-2 rounded-xl text-sm font-medium bg-white text-left relative',
            'cursor-pointer transition-all duration-200 focus:outline-none shadow-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
            vs.trigger,
            open ? vs.active : '',
            className,
          ].join(' ')}
        >
          {selectedItem && selectedItem.value !== '' ? (
            <span>{selectedItem.label}</span>
          ) : (
            <span className="text-gray-400">{selectedItem?.label ?? items[0]?.label ?? '—'}</span>
          )}
          <span className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 ${vs.icon}`}>
            <ChevronDown
              size={16}
              strokeWidth={2.5}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {/* Custom dropdown panel */}
        {open && (
          <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="py-1 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const isSelected = item.value === localValue
                const isEmpty = item.value === ''
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => !item.disabled && handleSelect(item.value)}
                    className={[
                      'w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2',
                      'transition-colors duration-100',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      isEmpty ? 'text-gray-400 italic' : 'font-medium',
                      isSelected ? vs.sel : `text-gray-700 ${vs.hover}`,
                    ].join(' ')}
                  >
                    <span>{item.label}</span>
                    {isSelected && !isEmpty && <Check size={13} className={vs.check} strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)

SelectField.displayName = 'SelectField'
export default SelectField

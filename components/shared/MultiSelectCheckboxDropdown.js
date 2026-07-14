'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

export default function MultiSelectCheckboxDropdown({
  options = [],
  values = [],
  onChange,
  placeholder = 'Select values',
  disabled = false,
  emptyMessage = 'No options available.',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const selectedSet = useMemo(() => new Set(values.map((v) => String(v))), [values])

  const selectedLabels = useMemo(() => {
    if (!values.length) return ''
    return options
      .filter((opt) => selectedSet.has(String(opt.value)))
      .map((opt) => opt.label)
      .join(', ')
  }, [options, selectedSet, values.length])

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggleValue = (value) => {
    const str = String(value)
    const next = selectedSet.has(str)
      ? values.filter((v) => String(v) !== str)
      : [...values, str]
    onChange?.(next)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)] disabled:opacity-50',
          !selectedLabels && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{selectedLabels || placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">{emptyMessage}</div>
            ) : (
              options.map((opt) => {
                const checked = selectedSet.has(String(opt.value))
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted/40"
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WorkflowFormMultiSelect({
  values = [],
  onChange,
  forms = [],
  loading = false,
  placeholder = 'Select forms…',
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const options = forms
    .map((form) => {
      const id = form?._id || form?.id
      if (!id) return null
      return { value: String(id), label: form?.name || 'Untitled form' }
    })
    .filter(Boolean)

  const selected = new Set(values.map(String))
  const selectedOptions = options.filter((o) => selected.has(o.value))
  const available = options.filter((o) => !selected.has(o.value))
  const filtered = query.trim()
    ? available.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : available

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const minHeight = compact ? 'min-h-[44px]' : 'min-h-[56px]'

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-lg border border-border bg-background transition-colors focus-within:border-[var(--studio-primary)]',
        loading && 'opacity-60 pointer-events-none',
        minHeight
      )}
    >
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => onChange?.(values.filter((v) => String(v) !== opt.value))}
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`Remove ${opt.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between px-3 text-left outline-none',
          compact ? 'h-10 pb-2' : 'h-12 pb-2.5',
          selectedOptions.length > 0 && 'pt-0'
        )}
      >
        <span className={cn('text-[14px]', selectedOptions.length > 0 ? 'sr-only' : 'text-muted-foreground')}>
          {loading ? 'Loading forms…' : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forms…"
              className="h-9 w-full rounded-md border border-border bg-muted/30 px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-muted-foreground">
                {available.length === 0 ? 'All forms selected' : 'No matching forms'}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange?.([...values, opt.value])
                    setQuery('')
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-[13px] text-foreground hover:bg-muted/50"
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

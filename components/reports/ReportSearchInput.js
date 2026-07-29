'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export function ReportSearchInput({ value = '', onChange, placeholder = 'Search this table…' }) {
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (draft === value) return undefined
    const timer = setTimeout(() => onChangeRef.current?.(draft), 300)
    return () => clearTimeout(timer)
  }, [draft, value])

  return (
    <div className="relative min-w-[180px] max-w-sm flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onChangeRef.current?.(draft)
          }
        }}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft('')
            onChangeRef.current?.('')
          }}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

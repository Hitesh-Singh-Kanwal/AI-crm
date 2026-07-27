'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarRange } from 'lucide-react'

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '12M', days: 365 },
]

function isCustomRange(value) {
  return Boolean(value && typeof value === 'object' && value.from && value.to)
}

/** Compact date-range segmented control for dashboard / reports toolbars, with a custom from/to option. */
export default function DateRangePresets({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(isCustomRange(value) ? value.from : '')
  const [draftTo, setDraftTo] = useState(isCustomRange(value) ? value.to : '')
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function applyCustom() {
    if (!draftFrom || !draftTo) return
    onChange({ from: draftFrom, to: draftTo })
    setOpen(false)
  }

  return (
    <div className="relative" ref={popoverRef}>
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => {
              onChange(preset.days)
              setOpen(false)
            }}
            className={[
              'h-7 min-w-[36px] rounded px-2.5 text-[12px] font-medium transition-colors',
              value === preset.days
                ? 'bg-brand text-brand-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Custom date range"
          className={[
            'inline-flex h-7 items-center gap-1 rounded px-2.5 text-[12px] font-medium transition-colors',
            isCustomRange(value)
              ? 'bg-brand text-brand-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {isCustomRange(value) ? `${value.from} → ${value.to}` : 'Custom'}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-9 z-30 flex items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground"
          />
          <span className="text-[12px] text-muted-foreground">to</span>
          <input
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground"
          />
          <button
            type="button"
            onClick={applyCustom}
            disabled={!draftFrom || !draftTo}
            className="h-8 rounded-md bg-brand px-3 text-[12px] font-medium text-brand-foreground disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarRange, RotateCcw } from 'lucide-react'

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '12M', days: 365 },
]

const DEFAULT_DAYS = 30

function isCustomRange(value) {
  return Boolean(value && typeof value === 'object' && value.from && value.to)
}

function isDefaultRange(value, defaultDays) {
  return !isCustomRange(value) && value === defaultDays
}

/** Compact date-range segmented control for dashboard / reports toolbars, with a custom from/to option. */
export default function DateRangePresets({ value, onChange, defaultDays = DEFAULT_DAYS }) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(isCustomRange(value) ? value.from : '')
  const [draftTo, setDraftTo] = useState(isCustomRange(value) ? value.to : '')
  const popoverRef = useRef(null)

  useEffect(() => {
    if (isCustomRange(value)) {
      setDraftFrom(value.from)
      setDraftTo(value.to)
    } else {
      setDraftFrom('')
      setDraftTo('')
    }
  }, [value])

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

  function resetDates() {
    setDraftFrom('')
    setDraftTo('')
    setOpen(false)
    onChange(defaultDays)
  }

  const customActive = open || isCustomRange(value)
  const canReset = !isDefaultRange(value, defaultDays)

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {PRESETS.map((preset, index) => {
          const active = !customActive && value === preset.days
          return (
            <button
              key={preset.days}
              type="button"
              onClick={() => {
                onChange(preset.days)
                setOpen(false)
              }}
              className={[
                'inline-flex min-w-[2.5rem] items-center justify-center px-2.5 text-[12px] font-semibold leading-none transition-colors',
                index > 0 ? 'border-l border-border/70' : '',
                active
                  ? 'bg-[var(--studio-primary)] text-white'
                  : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground',
              ].join(' ')}
            >
              {preset.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Custom date range"
          className={[
            'inline-flex max-w-[15rem] items-center gap-1.5 border-l border-border/70 px-2.5 text-[12px] font-semibold leading-none transition-colors',
            customActive
              ? 'bg-[var(--studio-primary)] text-white'
              : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground',
          ].join(' ')}
        >
          <CalendarRange className="h-3.5 w-3.5 shrink-0 opacity-90" />
          <span className="truncate">
            {isCustomRange(value) ? `${value.from} → ${value.to}` : 'Custom'}
          </span>
        </button>
        {canReset && (
          <button
            type="button"
            onClick={resetDates}
            title="Reset date range"
            className="inline-flex items-center gap-1 border-l border-border/70 px-2.5 text-[12px] font-medium leading-none text-foreground/65 transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/55">
            Custom range
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              aria-label="Start date"
              className="box-border h-9 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/30"
            />
            <span className="hidden shrink-0 text-[12px] text-foreground/50 sm:inline">to</span>
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              aria-label="End date"
              className="box-border h-9 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/30"
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetDates}
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!draftFrom || !draftTo}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--studio-primary)] px-3.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-45"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

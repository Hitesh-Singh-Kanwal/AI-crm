'use client'

import { SlidersHorizontal } from 'lucide-react'

export function ReportFiltersButton({ activeCount = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  )
}

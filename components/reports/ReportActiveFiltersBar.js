'use client'

import { X } from 'lucide-react'
import { ReportFiltersButton } from '@/components/reports/ReportFiltersButton'

export function ReportActiveFiltersBar({
  activeCount = 0,
  onOpenFilters,
  chips = [],
  onRemoveChip,
  onReset,
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <ReportFiltersButton activeCount={activeCount} onClick={onOpenFilters} />

      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onRemoveChip?.(chip)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/50"
          title={chip.label}
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      )}
    </div>
  )
}

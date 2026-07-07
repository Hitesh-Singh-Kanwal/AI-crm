'use client'

import { Calendar, Filter, ListPlus, MapPin, Search, User, X } from 'lucide-react'
import {
  countAdvancedLeadFilters,
  getActiveLeadFilterChips,
  hasActiveLeadFilters,
  removeLeadFilterKeys,
} from '@/lib/lead-page-filters'
import QuickBarSearchControl from '@/components/shared/QuickBarSearchControl'

const CHIP_ICONS = {
  search: Search,
  stage: User,
  uploadType: User,
  relativeCreated: Calendar,
  createdFrom: Calendar,
  createdTo: Calendar,
  updatedFrom: Calendar,
  updatedTo: Calendar,
  bookingStatus: Calendar,
  reason: User,
  utm_source: User,
  locationID: MapPin,
  formID: Filter,
  isEscalated: User,
  'condition-logic': Filter,
}

export default function LeadsQuickBar({
  filters,
  onChange,
  onClear,
  onOpenAdvanced,
  onCreateList,
  locations = [],
  forms = [],
  leadReasons = [],
  canCreateList = false,
}) {
  const advancedCount = countAdvancedLeadFilters(filters)
  const chips = getActiveLeadFilterChips(filters, { locations, forms, leadReasons, list: null })

  const removeChip = (chip) => {
    if (chip.locked) return
    onChange(removeLeadFilterKeys(filters, chip.keys))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <QuickBarSearchControl filters={filters} onChange={onChange} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40"
          >
            <Filter className="h-4 w-4" />
            Filters
            {advancedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[11px] font-semibold text-white">
                {advancedCount}
              </span>
            )}
          </button>

          {canCreateList && hasActiveLeadFilters(filters) && (
            <button
              type="button"
              onClick={onCreateList}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--studio-primary)]/30 bg-[var(--studio-primary)]/10 px-4 text-[13px] font-medium text-[var(--studio-primary)] hover:bg-[var(--studio-primary)]/15"
            >
              <ListPlus className="h-4 w-4" />
              Save as list
            </button>
          )}

          {hasActiveLeadFilters(filters) && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 items-center gap-1 rounded-xl px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted/40"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const Icon = CHIP_ICONS[chip.id] || Filter
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => removeChip(chip)}
                disabled={chip.locked}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/50 disabled:cursor-default"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {chip.label}
                {!chip.locked && <X className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

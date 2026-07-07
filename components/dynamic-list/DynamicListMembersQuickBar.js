'use client'

import { Calendar, Filter, ListPlus, MapPin, Search, User, X } from 'lucide-react'
import {
  countAdvancedMemberFilters,
  getActiveMemberFilterChips,
  hasActiveMemberFilters,
  removeMemberFilterKeys,
} from '@/lib/dynamic-list-member-filters'
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

export default function DynamicListMembersQuickBar({
  filters,
  onChange,
  onClear,
  onOpenAdvanced,
  onCreateList,
  canCreateList = false,
  list = null,
  locations = [],
  forms = [],
  leadReasons = [],
}) {
  const advancedCount = countAdvancedMemberFilters(filters, list)
  const chips = getActiveMemberFilterChips(filters, { locations, forms, leadReasons, list })

  const removeChip = (chip) => {
    if (chip.locked) return
    onChange(removeMemberFilterKeys(filters, chip.keys))
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <QuickBarSearchControl filters={filters} onChange={onChange} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted/40"
          >
            <Filter className="h-4 w-4" />
            More filters
            {advancedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[11px] font-bold text-white">
                {advancedCount}
              </span>
            )}
          </button>

          {canCreateList && hasActiveMemberFilters(filters) && (
            <button
              type="button"
              onClick={onCreateList}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--studio-primary)]/30 bg-[var(--studio-primary)]/10 px-4 text-[13px] font-medium text-[var(--studio-primary)] hover:bg-[var(--studio-primary)]/15"
            >
              <ListPlus className="h-4 w-4" />
              Save as list
            </button>
          )}
        </div>
      </div>

      {hasActiveMemberFilters(filters) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-muted-foreground">Active filters:</span>
          {chips.map((chip) => {
            const Icon = CHIP_ICONS[chip.id] || Filter
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => removeChip(chip)}
                disabled={chip.locked}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--studio-primary)]/20 bg-[var(--studio-primary)]/8 px-3 py-1.5 text-[12px] font-medium text-[var(--studio-primary)] hover:bg-[var(--studio-primary)]/12 disabled:cursor-default disabled:opacity-80"
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
                {!chip.locked && <X className="h-3.5 w-3.5" />}
              </button>
            )
          })}
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-[var(--studio-primary)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

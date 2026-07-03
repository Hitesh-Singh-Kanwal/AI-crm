'use client'

import { useMemo } from 'react'
import { Calendar, Filter, MapPin, Search, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FORM_SUBMISSION_UPLOAD_TYPE,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
  countAdvancedMemberFilters,
  getActiveMemberFilterChips,
  getHiddenMemberFilterFields,
  hasActiveMemberFilters,
  removeMemberFilterKeys,
} from '@/lib/dynamic-list-member-filters'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'

const selectClass =
  'h-11 rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

const searchClass =
  'h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

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
}

export default function DynamicListMembersQuickBar({
  filters,
  onChange,
  onClear,
  onOpenAdvanced,
  list = null,
  locations = [],
  forms = [],
  leadReasons = [],
}) {
  const hiddenFields = useMemo(() => getHiddenMemberFilterFields(list), [list])
  const advancedCount = countAdvancedMemberFilters(filters, list)
  const chips = getActiveMemberFilterChips(filters, { locations, forms, leadReasons, list })

  const update = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'uploadType' && value !== FORM_SUBMISSION_UPLOAD_TYPE) {
      next.utm_source = ''
    }
    onChange(next)
  }

  const removeChip = (chip) => {
    onChange(removeMemberFilterKeys(filters, chip.keys))
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search by name, email, phone or location..."
            className={searchClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hiddenFields.has('stage') && (
            <select
              value={filters.stage}
              onChange={(e) => update('stage', e.target.value)}
              className={cn(selectClass, 'min-w-[140px]')}
            >
              <option value="">All stages</option>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatFieldDisplayValue(opt)}
                </option>
              ))}
            </select>
          )}

          {!hiddenFields.has('uploadType') && (
            <select
              value={filters.uploadType}
              onChange={(e) => update('uploadType', e.target.value)}
              className={cn(selectClass, 'min-w-[160px]')}
            >
              <option value="">All upload types</option>
              {UPLOAD_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatFieldDisplayValue(opt)}
                </option>
              ))}
            </select>
          )}

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
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--studio-primary)]/20 bg-[var(--studio-primary)]/8 px-3 py-1.5 text-[12px] font-medium text-[var(--studio-primary)] hover:bg-[var(--studio-primary)]/12"
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
                <X className="h-3.5 w-3.5" />
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

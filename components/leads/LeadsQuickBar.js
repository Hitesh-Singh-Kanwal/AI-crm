'use client'

import { Calendar, Filter, ListPlus, MapPin, Search, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FORM_SUBMISSION_UPLOAD_TYPE,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
  countAdvancedLeadFilters,
  getActiveLeadFilterChips,
  hasActiveLeadFilters,
  removeLeadFilterKeys,
} from '@/lib/lead-page-filters'
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

  const update = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'stage') {
      next.stageOperator = 'eq'
      next.stage = value
    }
    if (key === 'uploadType') {
      next.uploadTypeOperator = 'eq'
      next.uploadType = value
      if (value !== FORM_SUBMISSION_UPLOAD_TYPE) {
        next.utm_source = ''
        next.sourceOperator = 'eq'
      }
    }
    onChange(next)
  }

  const removeChip = (chip) => {
    if (chip.locked) return
    onChange(removeLeadFilterKeys(filters, chip.keys))
  }

  return (
    <div className="space-y-4">
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
          <select
            value={Array.isArray(filters.stage) ? '' : String(filters.stage || '')}
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

          <select
            value={Array.isArray(filters.uploadType) ? '' : String(filters.uploadType || '')}
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

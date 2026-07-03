'use client'

import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMPTY_MEMBER_FILTERS,
  FORM_SUBMISSION_UPLOAD_TYPE,
  MEMBER_BOOKING_STATUS_OPTIONS,
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
  getHiddenMemberFilterFields,
  hasActiveMemberFilters,
  shouldShowSourceFilter,
} from '@/lib/dynamic-list-member-filters'
import { formatFieldDisplayValue, getLeadReasonOptions } from '@/lib/dynamic-list-normalize'

const selectClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function DynamicListMembersFilters({
  filters,
  onChange,
  onClear,
  list = null,
  locations = [],
  forms = [],
  leadReasons = [],
  loadingOptions = false,
}) {
  const hiddenFields = useMemo(() => getHiddenMemberFilterFields(list), [list])
  const showSource = shouldShowSourceFilter(list, filters)
  const reasonOptions = getLeadReasonOptions(leadReasons)

  const update = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'uploadType' && value !== FORM_SUBMISSION_UPLOAD_TYPE) {
      next.utm_source = ''
    }
    onChange(next)
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold text-foreground">Filter members</div>
          <div className="text-[12px] text-muted-foreground">
            Search matches name, email, phone, and location. Other fields use exact or partial match.
          </div>
        </div>
        {hasActiveMemberFilters(filters) && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/40"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => update('search', e.target.value)}
              placeholder="Name, email, phone, location"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>

        {!hiddenFields.has('stage') && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Stage</label>
            <select value={filters.stage} onChange={(e) => update('stage', e.target.value)} className={selectClass}>
              <option value="">All stages</option>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatFieldDisplayValue(opt)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!hiddenFields.has('uploadType') && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Upload type</label>
            <select
              value={filters.uploadType}
              onChange={(e) => update('uploadType', e.target.value)}
              className={selectClass}
            >
              <option value="">All upload types</option>
              {UPLOAD_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatFieldDisplayValue(opt)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Booking status</label>
          <select
            value={filters.bookingStatus}
            onChange={(e) => update('bookingStatus', e.target.value)}
            className={selectClass}
          >
            <option value="">All booking statuses</option>
            {MEMBER_BOOKING_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {formatFieldDisplayValue(opt)}
              </option>
            ))}
          </select>
        </div>

        {!hiddenFields.has('reason') && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Reason</label>
            <select
              value={filters.reason}
              onChange={(e) => update('reason', e.target.value)}
              disabled={loadingOptions}
              className={selectClass}
            >
              <option value="">{loadingOptions ? 'Loading…' : 'All reasons'}</option>
              {reasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showSource && !hiddenFields.has('utm_source') && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Source</label>
            <select
              value={filters.utm_source}
              onChange={(e) => update('utm_source', e.target.value)}
              className={selectClass}
            >
              <option value="">All sources</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatFieldDisplayValue(opt)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Location</label>
          <select
            value={filters.locationID}
            onChange={(e) => update('locationID', e.target.value)}
            disabled={loadingOptions}
            className={selectClass}
          >
            <option value="">{loadingOptions ? 'Loading…' : 'All locations'}</option>
            {locations.map((loc) => (
              <option key={loc._id} value={loc._id}>
                {loc.name || loc._id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Form</label>
          <select
            value={filters.formID}
            onChange={(e) => update('formID', e.target.value)}
            disabled={loadingOptions}
            className={selectClass}
          >
            <option value="">{loadingOptions ? 'Loading…' : 'All forms'}</option>
            {forms.map((form) => (
              <option key={form._id} value={form._id}>
                {form.name || form.title || form._id}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export { EMPTY_MEMBER_FILTERS }

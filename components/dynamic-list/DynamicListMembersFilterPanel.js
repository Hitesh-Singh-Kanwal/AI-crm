'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DATE_RANGE_PRESETS,
  EMPTY_MEMBER_FILTERS,
  FORM_SUBMISSION_UPLOAD_TYPE,
  MEMBER_BOOKING_STATUS_OPTIONS,
  SOURCE_OPTIONS,
  applyDateRangePreset,
  getDateRangePresetValue,
  getHiddenMemberFilterFields,
  shouldShowSourceFilter,
  shouldShowFormFilter,
} from '@/lib/dynamic-list-member-filters'
import { formatFieldDisplayValue, getLeadReasonOptions } from '@/lib/dynamic-list-normalize'

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function DynamicListMembersFilterPanel({
  open,
  appliedFilters,
  onClose,
  onApply,
  list = null,
  locations = [],
  forms = [],
  leadReasons = [],
  loadingOptions = false,
}) {
  const [draft, setDraft] = useState(appliedFilters)
  const hiddenFields = useMemo(() => getHiddenMemberFilterFields(list), [list])
  const visibilityFilters = { ...draft, uploadType: appliedFilters.uploadType }
  const showSource = shouldShowSourceFilter(list, visibilityFilters)
  const showForm = shouldShowFormFilter(list, visibilityFilters)
  const reasonOptions = getLeadReasonOptions(leadReasons)
  const datePreset = getDateRangePresetValue(draft)
  const showCustomDates = datePreset === 'custom'

  useEffect(() => {
    if (open) setDraft(appliedFilters)
  }, [open, appliedFilters])

  const update = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      const dateKeys = [
        'relativeCreated',
        'relativeCreatedDays',
        'createdFrom',
        'createdTo',
        'updatedFrom',
        'updatedTo',
      ]
      if (dateKeys.includes(key)) {
        next.dateRangePreset = 'custom'
      }
      if (key === 'uploadType' && value !== FORM_SUBMISSION_UPLOAD_TYPE) {
        next.utm_source = ''
      }
      return next
    })
  }

  const updateDatePreset = (preset) => {
    setDraft((prev) => applyDateRangePreset(preset, prev))
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-[18px] font-semibold text-foreground">Filters</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_MEMBER_FILTERS)}
              className="text-[13px] font-medium text-[var(--studio-primary)] hover:underline"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Date range</label>
            <select
              value={datePreset}
              onChange={(e) => updateDatePreset(e.target.value)}
              className={selectClass}
            >
              {DATE_RANGE_PRESETS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {showCustomDates && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Days (N)</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.relativeCreatedDays}
                    onChange={(e) => update('relativeCreatedDays', e.target.value)}
                    placeholder="90"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Lead created</label>
                  <select
                    value={draft.relativeCreated}
                    onChange={(e) => update('relativeCreated', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">After or before</option>
                    <option value="after">After</option>
                    <option value="before">Before</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Created from</label>
                  <input
                    type="date"
                    value={draft.createdFrom}
                    onChange={(e) => update('createdFrom', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Created to</label>
                  <input
                    type="date"
                    value={draft.createdTo}
                    onChange={(e) => update('createdTo', e.target.value)}
                    min={draft.createdFrom || undefined}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Updated from</label>
                  <input
                    type="date"
                    value={draft.updatedFrom}
                    onChange={(e) => update('updatedFrom', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Updated to</label>
                  <input
                    type="date"
                    value={draft.updatedTo}
                    onChange={(e) => update('updatedTo', e.target.value)}
                    min={draft.updatedFrom || undefined}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Booking status</label>
            <select
              value={draft.bookingStatus}
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
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Reason</label>
              <select
                value={draft.reason}
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
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Source</label>
              <select
                value={draft.utm_source}
                onChange={(e) => update('utm_source', e.target.value)}
                className={selectClass}
              >
                <option value="">Select sources</option>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {formatFieldDisplayValue(opt)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Location</label>
            <select
              value={draft.locationID}
              onChange={(e) => update('locationID', e.target.value)}
              disabled={loadingOptions}
              className={selectClass}
            >
              <option value="">{loadingOptions ? 'Loading…' : 'Select location'}</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name || loc._id}
                </option>
              ))}
            </select>
          </div>

          {showForm && (
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Form</label>
              <select
                value={draft.formID}
                onChange={(e) => update('formID', e.target.value)}
                disabled={loadingOptions}
                className={selectClass}
              >
                <option value="">{loadingOptions ? 'Loading…' : 'Select form'}</option>
                {forms.map((form) => (
                  <option key={form._id} value={form._id}>
                    {form.name || form.title || form._id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background text-[14px] font-semibold text-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply?.(draft)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--studio-primary)] text-[14px] font-semibold text-white hover:brightness-95"
          >
            Apply filters
          </button>
        </div>
      </aside>
    </>
  )
}

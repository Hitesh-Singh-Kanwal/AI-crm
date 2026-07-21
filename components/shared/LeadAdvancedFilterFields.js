'use client'

import { DATE_RANGE_PRESETS, applyDateRangePreset, getDateRangePresetValue } from '@/lib/dynamic-list-member-filters'
import { UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'
import { getFieldValueOptions } from '@/lib/lead-filter-fields'
import { useLeadStages } from '@/lib/lead-stages'
import FilterFieldWithOperator from '@/components/shared/FilterFieldWithOperator'
import FilterLogicToggle from '@/components/shared/FilterLogicToggle'
import { uploadFiltersIncludeFormSubmission } from '@/lib/lead-page-filters'
import { formatFieldDisplayValue, getLeadReasonOptions } from '@/lib/dynamic-list-normalize'

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function LeadAdvancedFilterFields({
  draft,
  onDraftChange,
  hiddenFields = new Set(),
  showSource = false,
  showForm = false,
  locations = [],
  forms = [],
  leadReasons = [],
  loadingOptions = false,
  showEscalated = true,
}) {
  const { stages: stageOptions } = useLeadStages()
  const reasonOptions = getLeadReasonOptions(leadReasons)
  const bookingOptions = getFieldValueOptions('bookingStatus', { leadReasons, locations, forms }) || []
  const sourceOptions = getFieldValueOptions('source', { leadReasons, locations, forms }) || []
  const locationOptions = getFieldValueOptions('locationID', { leadReasons, locations, forms }) || []
  const formOptions = getFieldValueOptions('formID', { leadReasons, locations, forms }) || []
  const uploadTypeOptions = UPLOAD_TYPE_OPTIONS.map((value) => ({
    value,
    label: formatFieldDisplayValue(value),
  }))
  const datePreset = getDateRangePresetValue(draft)
  const showCustomDates = datePreset === 'custom'

  const update = (key, value) => {
    const next = { ...draft, [key]: value }
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
    onDraftChange(next)
  }

  const updateDatePreset = (preset) => {
    onDraftChange(applyDateRangePreset(preset, draft))
  }

  const handleUploadChange = (next) => {
    if (!uploadFiltersIncludeFormSubmission(next)) {
      onDraftChange({ ...next, utm_source: '', sourceOperator: 'eq' })
      return
    }
    onDraftChange(next)
  }

  return (
    <div className="space-y-4">
      <FilterLogicToggle
        value={draft.conditionLogic || 'AND'}
        onChange={(logic) => onDraftChange({ ...draft, conditionLogic: logic })}
      />

      {!hiddenFields.has('stage') && (
        <FilterFieldWithOperator
          label="Stage"
          filterKey="stage"
          operatorKey="stageOperator"
          filters={draft}
          onChange={onDraftChange}
          options={stageOptions}
          emptyOptionLabel="All stages"
        />
      )}

      {!hiddenFields.has('uploadType') && (
        <FilterFieldWithOperator
          label="Upload type"
          filterKey="uploadType"
          operatorKey="uploadTypeOperator"
          filters={draft}
          onChange={handleUploadChange}
          options={uploadTypeOptions}
          emptyOptionLabel="All upload types"
        />
      )}

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Date range</label>
        <select value={datePreset} onChange={(e) => updateDatePreset(e.target.value)} className={selectClass}>
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
              <input type="date" value={draft.createdFrom} onChange={(e) => update('createdFrom', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Created to</label>
              <input type="date" value={draft.createdTo} onChange={(e) => update('createdTo', e.target.value)} min={draft.createdFrom || undefined} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Updated from</label>
              <input type="date" value={draft.updatedFrom} onChange={(e) => update('updatedFrom', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Updated to</label>
              <input type="date" value={draft.updatedTo} onChange={(e) => update('updatedTo', e.target.value)} min={draft.updatedFrom || undefined} className={inputClass} />
            </div>
          </div>
        </>
      )}

      <FilterFieldWithOperator
        label="Booking status"
        filterKey="bookingStatus"
        operatorKey="bookingStatusOperator"
        filters={draft}
        onChange={onDraftChange}
        options={bookingOptions}
        emptyOptionLabel="All booking statuses"
      />

      {!hiddenFields.has('reason') && (
        <FilterFieldWithOperator
          label="Reason"
          filterKey="reason"
          operatorKey="reasonOperator"
          filters={draft}
          onChange={onDraftChange}
          options={reasonOptions}
          loadingOptions={loadingOptions}
          emptyOptionLabel="All reasons"
        />
      )}

      {showSource && !hiddenFields.has('utm_source') && (
        <FilterFieldWithOperator
          label="Source"
          filterKey="utm_source"
          operatorKey="sourceOperator"
          filters={draft}
          onChange={onDraftChange}
          options={sourceOptions}
          emptyOptionLabel="All sources"
        />
      )}

      <FilterFieldWithOperator
        label="Location"
        filterKey="locationID"
        operatorKey="locationOperator"
        filters={draft}
        onChange={onDraftChange}
        options={locationOptions}
        loadingOptions={loadingOptions}
        emptyOptionLabel="All locations"
      />

      {showForm && (
        <FilterFieldWithOperator
          label="Form"
          filterKey="formID"
          operatorKey="formOperator"
          filters={draft}
          onChange={onDraftChange}
          options={formOptions}
          loadingOptions={loadingOptions}
          emptyOptionLabel="All forms"
        />
      )}

      {showEscalated && !hiddenFields.has('isEscalated') && (
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Escalated</label>
          <select
            value={draft.isEscalated === true || draft.isEscalated === 'true' ? 'true' : ''}
            onChange={(e) => update('isEscalated', e.target.value)}
            className={selectClass}
          >
            <option value="">All leads</option>
            <option value="true">Escalated only</option>
          </select>
        </div>
      )}
    </div>
  )
}

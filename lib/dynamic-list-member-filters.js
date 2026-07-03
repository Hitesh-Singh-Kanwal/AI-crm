import { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'

export const MEMBER_BOOKING_STATUS_OPTIONS = ['Not Booked', 'Booked']

export const FORM_SUBMISSION_UPLOAD_TYPE = 'form_submission'

const CONDITION_TO_FILTER_FIELD = {
  stage: 'stage',
  uploadType: 'uploadType',
  source: 'utm_source',
  reason: 'reason',
}

export const EMPTY_MEMBER_FILTERS = {
  search: '',
  stage: '',
  uploadType: '',
  bookingStatus: '',
  utm_source: '',
  locationID: '',
  formID: '',
  reason: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
  relativeCreated: '',
  relativeCreatedDays: '',
  dateRangePreset: '',
}

function formatRelativeCreatedParams(filters) {
  const days = parseInt(String(filters?.relativeCreatedDays ?? '').trim(), 10)
  if (!Number.isFinite(days) || days < 1) {
    return { withinDays: '', olderThanDays: '' }
  }
  if (filters?.relativeCreated === 'after') {
    return { withinDays: String(days), olderThanDays: '' }
  }
  if (filters?.relativeCreated === 'before') {
    return { withinDays: '', olderThanDays: String(days) }
  }
  return { withinDays: '', olderThanDays: '' }
}

function formatDateFromParam(dateStr) {
  const trimmed = String(dateStr ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('T')) return trimmed
  return `${trimmed}T00:00:00.000Z`
}

function formatDateToParam(dateStr) {
  const trimmed = String(dateStr ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('T')) return trimmed
  return `${trimmed}T23:59:59.999Z`
}

function getConditionValues(condition) {
  const operator = condition?.operator || 'eq'
  const value = condition?.value

  if (operator === 'in') {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    }
    return []
  }

  const normalized = Array.isArray(value) ? String(value[0] ?? '').trim() : String(value ?? '').trim()
  return normalized ? [normalized] : []
}

function isFixedCondition(condition) {
  const operator = condition?.operator || 'eq'
  if (operator !== 'eq' && operator !== 'in') return false
  return getConditionValues(condition).length === 1
}

/** Member filter fields pinned by list conditions (eq / single-value in). */
export function getHiddenMemberFilterFields(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  const hidden = new Set()

  for (const condition of conditions) {
    const filterKey = CONDITION_TO_FILTER_FIELD[condition?.field]
    if (filterKey && isFixedCondition(condition)) {
      hidden.add(filterKey)
    }
  }

  // Upload type filter is redundant when list already scopes by source or form submission.
  if (listHasSourceCondition(list) || listHasFormSubmissionCondition(list)) {
    hidden.add('uploadType')
  }

  return hidden
}

export function listHasFormSubmissionCondition(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []

  return conditions.some((condition) => {
    if (condition?.field !== 'uploadType') return false
    const operator = condition?.operator || 'eq'
    if (operator !== 'eq' && operator !== 'in') return false
    const values = getConditionValues(condition)
    return values.length === 1 && values[0] === FORM_SUBMISSION_UPLOAD_TYPE
  })
}

export function listHasSourceCondition(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  return conditions.some((condition) => condition?.field === 'source')
}

export function shouldShowSourceFilter(list, filters) {
  if (filters?.uploadType === FORM_SUBMISSION_UPLOAD_TYPE) return true
  return listHasFormSubmissionCondition(list)
}

export function shouldShowFormFilter(list, filters) {
  if (listHasSourceCondition(list)) return true
  if (filters?.uploadType === FORM_SUBMISSION_UPLOAD_TYPE) return true
  return listHasFormSubmissionCondition(list)
}

export function sanitizeMemberFilters(list, filters) {
  const hidden = getHiddenMemberFilterFields(list)
  const next = { ...filters }

  for (const key of hidden) {
    next[key] = ''
  }

  if (!shouldShowSourceFilter(list, next)) {
    next.utm_source = ''
  }

  if (!shouldShowFormFilter(list, next)) {
    next.formID = ''
  }

  return next
}

export function buildMemberFilterParams({ page, limit, filters }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const relativeCreated = formatRelativeCreatedParams(filters)

  const entries = {
    search: filters?.search,
    stage: filters?.stage,
    uploadType: filters?.uploadType,
    bookingStatus: filters?.bookingStatus,
    utm_source: filters?.utm_source,
    locationID: filters?.locationID,
    formID: filters?.formID,
    reason: filters?.reason,
    createdFrom: formatDateFromParam(filters?.createdFrom),
    createdTo: formatDateToParam(filters?.createdTo),
    updatedFrom: formatDateFromParam(filters?.updatedFrom),
    updatedTo: formatDateToParam(filters?.updatedTo),
    withinDays: relativeCreated.withinDays,
    olderThanDays: relativeCreated.olderThanDays,
  }

  for (const [key, value] of Object.entries(entries)) {
    const trimmed = String(value ?? '').trim()
    if (trimmed) params.set(key, trimmed)
  }

  return params
}

export function hasActiveMemberFilters(filters) {
  if (!filters) return false
  const { relativeCreated, relativeCreatedDays, dateRangePreset, ...rest } = filters
  const hasRelative =
    Boolean(relativeCreated) && parseInt(String(relativeCreatedDays ?? '').trim(), 10) >= 1
  return hasRelative || Object.values(rest).some((v) => String(v ?? '').trim() !== '')
}

export const DATE_RANGE_PRESETS = [
  { value: '', label: 'All time' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

export function getDateRangePresetValue(filters) {
  if (filters?.dateRangePreset) return filters.dateRangePreset

  const days = parseInt(String(filters?.relativeCreatedDays ?? '').trim(), 10)
  if (filters?.relativeCreated === 'after' && days === 7) return 'last_7'
  if (filters?.relativeCreated === 'after' && days === 30) return 'last_30'
  if (filters?.relativeCreated === 'after' && days === 90) return 'last_90'
  if (
    filters?.relativeCreated ||
    filters?.relativeCreatedDays ||
    filters?.createdFrom ||
    filters?.createdTo ||
    filters?.updatedFrom ||
    filters?.updatedTo
  ) {
    return 'custom'
  }
  return ''
}

export function applyDateRangePreset(preset, filters) {
  if (preset === 'custom') {
    const next = { ...filters, dateRangePreset: 'custom' }
    const fromFixedPreset = ['last_7', 'last_30', 'last_90'].includes(filters?.dateRangePreset)
    if (fromFixedPreset) {
      next.relativeCreated = ''
      next.relativeCreatedDays = ''
    }
    return next
  }

  const next = {
    ...filters,
    dateRangePreset: preset,
    relativeCreated: '',
    relativeCreatedDays: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
  }

  if (preset === 'last_7') {
    next.relativeCreated = 'after'
    next.relativeCreatedDays = '7'
  } else if (preset === 'last_30') {
    next.relativeCreated = 'after'
    next.relativeCreatedDays = '30'
  } else if (preset === 'last_90') {
    next.relativeCreated = 'after'
    next.relativeCreatedDays = '90'
  }

  return next
}

function hasAnyDateFilterValues(filters) {
  return Boolean(
    filters?.relativeCreated ||
      filters?.relativeCreatedDays ||
      filters?.createdFrom ||
      filters?.createdTo ||
      filters?.updatedFrom ||
      filters?.updatedTo
  )
}

const QUICK_FILTER_KEYS = new Set(['search', 'stage', 'uploadType'])

export function countAdvancedMemberFilters(filters, list = null) {
  if (!filters) return 0
  const hidden = getHiddenMemberFilterFields(list)
  let count = 0

  const check = (key, value) => {
    if (QUICK_FILTER_KEYS.has(key)) return
    if (hidden.has(key)) return
    if (key === 'utm_source' && !shouldShowSourceFilter(list, filters)) return
    if (key === 'formID' && !shouldShowFormFilter(list, filters)) return
    if (String(value ?? '').trim()) count += 1
  }

  check('bookingStatus', filters.bookingStatus)
  check('reason', filters.reason)
  check('utm_source', filters.utm_source)
  check('locationID', filters.locationID)
  check('formID', filters.formID)
  check('createdFrom', filters.createdFrom)
  check('createdTo', filters.createdTo)
  check('updatedFrom', filters.updatedFrom)
  check('updatedTo', filters.updatedTo)

  const hasRelative =
    Boolean(filters.relativeCreated) &&
    parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10) >= 1
  if (hasRelative) count += 1

  return count
}

export function getActiveMemberFilterChips(filters, { locations = [], forms = [], leadReasons = [], list = null } = {}) {
  if (!filters) return []
  const chips = []
  const hidden = getHiddenMemberFilterFields(list)
  const reasonOptions = getLeadReasonOptionsForChips(leadReasons)

  const push = (id, label, keys) => chips.push({ id, label, keys })

  if (filters.search?.trim()) {
    push('search', `Search: ${filters.search.trim()}`, ['search'])
  }
  if (!hidden.has('stage') && filters.stage?.trim()) {
    push('stage', `Stage: ${formatChipValue(filters.stage)}`, ['stage'])
  }
  if (!hidden.has('uploadType') && filters.uploadType?.trim()) {
    push('uploadType', `Upload: ${formatChipValue(filters.uploadType)}`, ['uploadType'])
  }

  const days = parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10)
  if (filters.relativeCreated === 'after' && days >= 1) {
    push('relativeCreated', `Last ${days} day${days === 1 ? '' : 's'}`, ['relativeCreated', 'relativeCreatedDays'])
  } else if (filters.relativeCreated === 'before' && days >= 1) {
    push('relativeCreated', `Older than ${days} day${days === 1 ? '' : 's'}`, ['relativeCreated', 'relativeCreatedDays'])
  }

  if (filters.createdFrom?.trim()) {
    push('createdFrom', `Created from ${filters.createdFrom}`, ['createdFrom'])
  }
  if (filters.createdTo?.trim()) {
    push('createdTo', `Created to ${filters.createdTo}`, ['createdTo'])
  }
  if (filters.updatedFrom?.trim()) {
    push('updatedFrom', `Updated from ${filters.updatedFrom}`, ['updatedFrom'])
  }
  if (filters.updatedTo?.trim()) {
    push('updatedTo', `Updated to ${filters.updatedTo}`, ['updatedTo'])
  }

  if (filters.bookingStatus?.trim()) {
    push('bookingStatus', `Booking: ${filters.bookingStatus}`, ['bookingStatus'])
  }
  if (!hidden.has('reason') && filters.reason?.trim()) {
    const match = reasonOptions.find((o) => o.value === filters.reason)
    push('reason', `Reason: ${match?.label || filters.reason}`, ['reason'])
  }
  if (shouldShowSourceFilter(list, filters) && !hidden.has('utm_source') && filters.utm_source?.trim()) {
    push('utm_source', `Source: ${formatChipValue(filters.utm_source)}`, ['utm_source'])
  }
  if (filters.locationID?.trim()) {
    const loc = locations.find((l) => l._id === filters.locationID)
    push('locationID', `Location: ${loc?.name || filters.locationID}`, ['locationID'])
  }
  if (shouldShowFormFilter(list, filters) && filters.formID?.trim()) {
    const form = forms.find((f) => f._id === filters.formID)
    push('formID', `Form: ${form?.name || form?.title || filters.formID}`, ['formID'])
  }

  return chips
}

function getLeadReasonOptionsForChips(leadReasons = []) {
  return (leadReasons || [])
    .map((r) => ({
      value: String(r?.reasonCode || r?.name || '').trim(),
      label: String(r?.name || r?.reasonCode || '').trim(),
    }))
    .filter((o) => o.value)
}

function formatChipValue(value) {
  return String(value)
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function removeMemberFilterKeys(filters, keys = []) {
  const next = { ...filters }
  for (const key of keys) {
    if (key in next) next[key] = ''
  }
  if (keys.includes('relativeCreated') || keys.includes('relativeCreatedDays')) {
    next.relativeCreated = ''
    next.relativeCreatedDays = ''
  }
  if (
    keys.some((key) =>
      ['relativeCreated', 'relativeCreatedDays', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'].includes(key)
    )
  ) {
    next.dateRangePreset = hasAnyDateFilterValues(next) ? 'custom' : ''
  }
  return next
}

export { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS }

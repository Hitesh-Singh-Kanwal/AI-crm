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

export function shouldShowSourceFilter(list, filters) {
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

  return next
}

export function buildMemberFilterParams({ page, limit, filters }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const entries = {
    search: filters?.search,
    stage: filters?.stage,
    uploadType: filters?.uploadType,
    bookingStatus: filters?.bookingStatus,
    utm_source: filters?.utm_source,
    locationID: filters?.locationID,
    formID: filters?.formID,
    reason: filters?.reason,
  }

  for (const [key, value] of Object.entries(entries)) {
    const trimmed = String(value ?? '').trim()
    if (trimmed) params.set(key, trimmed)
  }

  return params
}

export function hasActiveMemberFilters(filters) {
  return Object.values(filters || {}).some((v) => String(v ?? '').trim() !== '')
}

export { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS }

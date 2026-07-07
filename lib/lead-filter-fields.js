import {
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
} from '@/lib/dynamic-list-constants'
import { MEMBER_BOOKING_STATUS_OPTIONS } from '@/lib/dynamic-list-member-filters'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import { flatFiltersToConditions } from '@/lib/lead-flat-filters'

/** Shared field definitions for lead filters, dynamic list conditions, and member filters. */
export const LEAD_FILTER_FIELD_DEFS = [
  { value: 'search', label: 'Search', inputType: 'text' },
  { value: 'stage', label: 'Stage', inputType: 'select', optionsKey: 'stage' },
  { value: 'uploadType', label: 'Upload type', inputType: 'select', optionsKey: 'uploadType' },
  { value: 'source', label: 'Source', inputType: 'select', optionsKey: 'source' },
  { value: 'reason', label: 'Reason', inputType: 'select', optionsKey: 'reason' },
  { value: 'bookingStatus', label: 'Booking status', inputType: 'select', optionsKey: 'bookingStatus' },
  { value: 'locationID', label: 'Location', inputType: 'select', optionsKey: 'locations' },
  { value: 'formID', label: 'Form', inputType: 'select', optionsKey: 'forms' },
  { value: 'isEscalated', label: 'Escalated', inputType: 'boolean' },
  { value: 'withinDays', label: 'Created within (days)', inputType: 'number' },
  { value: 'olderThanDays', label: 'Created older than (days)', inputType: 'number' },
  { value: 'createdFrom', label: 'Created from', inputType: 'date' },
  { value: 'createdTo', label: 'Created to', inputType: 'date' },
  { value: 'updatedFrom', label: 'Updated from', inputType: 'date' },
  { value: 'updatedTo', label: 'Updated to', inputType: 'date' },
]

export const CONDITION_FIELDS = LEAD_FILTER_FIELD_DEFS.map(({ value, label }) => ({ value, label }))

export const CONDITION_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Exclude' },
  { value: 'in', label: 'In' },
]

export const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

export function getConditionFieldDef(field) {
  return LEAD_FILTER_FIELD_DEFS.find((def) => def.value === field) || null
}

function toLabeledOptions(values = []) {
  return values.map((value) => ({
    value,
    label: formatFieldDisplayValue(value),
  }))
}

export function getLeadReasonOptions(leadReasons = []) {
  return (leadReasons || [])
    .map((r) => {
      const value = String(r?.reasonCode || r?.name || '').trim()
      const name = String(r?.name || '').trim()
      return {
        value,
        label: name || formatFieldDisplayValue(value),
      }
    })
    .filter((o) => o.value)
}

export function getFieldValueOptions(field, context = {}) {
  const { leadReasons = [], locations = [], forms = [] } = context
  const def = getConditionFieldDef(field)
  if (!def) return null

  if (def.optionsKey === 'stage') return toLabeledOptions(STAGE_OPTIONS)
  if (def.optionsKey === 'uploadType') return toLabeledOptions(UPLOAD_TYPE_OPTIONS)
  if (def.optionsKey === 'source') return toLabeledOptions(SOURCE_OPTIONS)
  if (def.optionsKey === 'reason') return getLeadReasonOptions(leadReasons)
  if (def.optionsKey === 'bookingStatus') return toLabeledOptions(MEMBER_BOOKING_STATUS_OPTIONS)
  if (def.optionsKey === 'locations') {
    return locations.map((loc) => ({
      value: loc._id,
      label: loc.name || loc._id,
    }))
  }
  if (def.optionsKey === 'forms') {
    return forms.map((form) => ({
      value: form._id,
      label: form.name || form.title || form._id,
    }))
  }
  if (def.inputType === 'boolean') return BOOLEAN_OPTIONS
  return null
}

export function formatConditionValueLabel(field, value, context = {}) {
  const values = Array.isArray(value) ? value : [value]
  const options = getFieldValueOptions(field, context) || []
  return values
    .map((v) => {
      const str = String(v)
      const match = options.find((o) => o.value === str || o.value === v)
      if (match) return match.label
      if (field === 'isEscalated') return str === 'true' ? 'Yes' : str === 'false' ? 'No' : formatFieldDisplayValue(str)
      return formatFieldDisplayValue(str)
    })
    .join(', ')
}

export function getOperatorsForField(field) {
  const def = getConditionFieldDef(field)
  if (!def) return CONDITION_OPERATORS
  if (def.inputType === 'text') return CONDITION_OPERATORS
  if (def.inputType === 'boolean' || def.inputType === 'number' || def.inputType === 'date') {
    return CONDITION_OPERATORS.filter((op) => op.value === 'eq')
  }
  return CONDITION_OPERATORS
}

export function normalizeConditionValue(operator, value) {
  if (operator === 'in' || operator === 'ne') {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    }
    return []
  }
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return String(value ?? '').trim()
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

export function getValidConditions(conditions = []) {
  if (!Array.isArray(conditions)) return []
  return conditions.filter((condition) => {
    const operator = condition?.operator || 'eq'
    if (operator === 'in' || operator === 'ne') {
      const values = normalizeConditionValue(operator, condition?.value)
      return values.length > 0
    }
    return String(condition?.value ?? '').trim() !== ''
  })
}

const CONDITION_FIELD_TO_QUERY_KEY = {
  stage: 'stage',
  uploadType: 'uploadType',
  source: 'utm_source',
  reason: 'reason',
  bookingStatus: 'bookingStatus',
  locationID: 'locationID',
  formID: 'formID',
  isEscalated: 'isEscalated',
  createdFrom: 'createdFrom',
  createdTo: 'createdTo',
  updatedFrom: 'updatedFrom',
  updatedTo: 'updatedTo',
  withinDays: 'withinDays',
  olderThanDays: 'olderThanDays',
}

function serializeConditionForApi(condition) {
  const operator = condition?.operator || 'eq'
  const value = normalizeConditionValue(operator, condition?.value)
  return {
    field: condition?.field,
    operator,
    value: operator === 'in' || operator === 'ne' ? value : String(value || ''),
  }
}

export function sanitizeAppliedConditionFilters(filters = {}) {
  return {
    ...filters,
    conditions: getValidConditions(filters.conditions),
  }
}

export function buildQueryParamsFromConditionFilters({
  page,
  limit,
  search = '',
  conditionLogic = 'AND',
  conditions = [],
}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))

  const trimmedSearch = String(search ?? '').trim()
  if (trimmedSearch) params.set('search', trimmedSearch)

  const validConditions = getValidConditions(conditions).map(serializeConditionForApi)
  if (validConditions.length > 0) {
    params.set('conditionLogic', conditionLogic === 'OR' ? 'OR' : 'AND')
    params.set('conditions', JSON.stringify(validConditions))

    for (const condition of validConditions) {
      const key = CONDITION_FIELD_TO_QUERY_KEY[condition.field]
      if (!key) continue

      if (condition.operator === 'eq' && !Array.isArray(condition.value)) {
        const value = String(condition.value ?? '').trim()
        if (!value) continue
        if (key === 'createdFrom' || key === 'updatedFrom') {
          params.set(key, formatDateFromParam(value))
        } else if (key === 'createdTo' || key === 'updatedTo') {
          params.set(key, formatDateToParam(value))
        } else {
          params.set(key, value)
        }
      }
    }
  }

  return params
}

/** Convert lead/member filter state into dynamic list conditions. */
export function filtersToConditions(filters = {}) {
  if (Array.isArray(filters?.conditions) && filters.conditions.length > 0) {
    return getValidConditions(filters.conditions).map(serializeConditionForApi)
  }
  return flatFiltersToConditions(filters)
}

export function buildLeadQueryParams({ page, limit, filters = {} }) {
  const conditions = Array.isArray(filters?.conditions) && filters.conditions.length > 0
    ? filters.conditions
    : flatFiltersToConditions(filters)

  const searchOperator = filters?.searchOperator || 'eq'
  const searchParam =
    searchOperator === 'eq' && !Array.isArray(filters?.search)
      ? String(filters?.search ?? '')
      : ''

  return buildQueryParamsFromConditionFilters({
    page,
    limit,
    search: searchParam,
    conditionLogic: filters.conditionLogic,
    conditions,
  })
}

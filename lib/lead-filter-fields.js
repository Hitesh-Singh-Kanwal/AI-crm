import {
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
} from '@/lib/dynamic-list-constants'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import { flatFiltersToConditions } from '@/lib/lead-flat-filters'
import {
  ALL_FILTER_FIELDS,
  FILTER_OPERATORS,
  conditionHasValue,
  getFilterFieldDef,
  getOperatorsForFilterField,
  isValuelessOperator,
  serializeFilterConditionForApi,
  usesMultiValueOperator,
} from '@/lib/dynamic-list-filter-catalog'

const MEMBER_BOOKING_STATUS_OPTIONS = ['Not Booked', 'Booked']

/** Shared field definitions for lead filters, dynamic list conditions, and member filters. */
export const LEAD_FILTER_FIELD_DEFS = [
  { value: 'search', label: 'Search', inputType: 'text' },
  ...ALL_FILTER_FIELDS.map(({ value, label, inputType, optionsKey }) => ({
    value,
    label,
    inputType: inputType === 'metadata' ? 'text' : inputType,
    optionsKey,
  })),
  // Legacy aliases still used by older saved lists / params
  { value: 'source', label: 'Source', inputType: 'select', optionsKey: 'source' },
  { value: 'withinDays', label: 'Created within (days)', inputType: 'number' },
  { value: 'olderThanDays', label: 'Created older than (days)', inputType: 'number' },
  { value: 'createdFrom', label: 'Created from', inputType: 'date' },
  { value: 'createdTo', label: 'Created to', inputType: 'date' },
  { value: 'updatedFrom', label: 'Updated from', inputType: 'date' },
  { value: 'updatedTo', label: 'Updated to', inputType: 'date' },
]

export const CONDITION_FIELDS = LEAD_FILTER_FIELD_DEFS.map(({ value, label }) => ({ value, label }))

export const CONDITION_OPERATORS = FILTER_OPERATORS.map(({ value, label }) => ({ value, label }))

export const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

export function getConditionFieldDef(field) {
  if (String(field || '').startsWith('metadata.')) {
    return getFilterFieldDef('metadata') || { value: 'metadata', label: 'Metadata', inputType: 'text' }
  }
  return getFilterFieldDef(field) || LEAD_FILTER_FIELD_DEFS.find((def) => def.value === field) || null
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

  if (def.optionsKey === 'stage' || field === 'stage') return toLabeledOptions(STAGE_OPTIONS)
  if (def.optionsKey === 'uploadType' || field === 'uploadType') return toLabeledOptions(UPLOAD_TYPE_OPTIONS)
  if (def.optionsKey === 'source' || field === 'source' || field === 'utm_source') return toLabeledOptions(SOURCE_OPTIONS)
  if (def.optionsKey === 'reason' || field === 'reason') return getLeadReasonOptions(leadReasons)
  if (def.optionsKey === 'bookingStatus' || field === 'bookingStatus') {
    return toLabeledOptions(MEMBER_BOOKING_STATUS_OPTIONS)
  }
  if (def.optionsKey === 'locations' || field === 'locationID') {
    return locations.map((loc) => ({
      value: loc._id,
      label: loc.name || loc._id,
    }))
  }
  if (def.optionsKey === 'forms' || field === 'formID') {
    return forms.map((form) => ({
      value: form._id,
      label: form.name || form.title || form._id,
    }))
  }
  if (def.staticOptions) {
    return def.staticOptions.map((opt) =>
      typeof opt === 'string'
        ? { value: opt, label: formatFieldDisplayValue(opt) }
        : { value: opt.value, label: opt.label || formatFieldDisplayValue(opt.value) }
    )
  }
  if (def.inputType === 'boolean') return BOOLEAN_OPTIONS
  return null
}

export function formatConditionValueLabel(field, value, context = {}) {
  const values = Array.isArray(value) ? value : [value]
  const options = getFieldValueOptions(field, context) || []
  return values
    .map((v) => {
      if (v && typeof v === 'object') {
        if ('from' in v && 'to' in v) return `${v.from} – ${v.to}`
        if ('key' in v) return `${v.key}=${v.value || ''}`
      }
      const str = String(v)
      const match = options.find((o) => o.value === str || o.value === v)
      if (match) return match.label
      if (field === 'isEscalated' || field === 'isConverted') {
        return str === 'true' ? 'Yes' : str === 'false' ? 'No' : formatFieldDisplayValue(str)
      }
      return formatFieldDisplayValue(str)
    })
    .join(', ')
}

export function getOperatorsForField(field) {
  const catalogOps = getOperatorsForFilterField(field)
  if (catalogOps?.length) return catalogOps
  const def = getConditionFieldDef(field)
  if (!def) return CONDITION_OPERATORS.filter((op) => ['eq', 'ne', 'in'].includes(op.value))
  if (def.inputType === 'boolean' || def.inputType === 'number' || def.inputType === 'date') {
    return CONDITION_OPERATORS.filter((op) => op.value === 'eq')
  }
  return CONDITION_OPERATORS.filter((op) => ['eq', 'ne', 'in'].includes(op.value))
}

export function normalizeConditionValue(operator, value) {
  if (isValuelessOperator(operator)) return true
  if (usesMultiValueOperator(operator) || operator === 'in' || operator === 'ne' || operator === 'not_in') {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    }
    return []
  }
  if (operator === 'between') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { from: String(value.from ?? '').trim(), to: String(value.to ?? '').trim() }
    }
    if (Array.isArray(value)) return { from: String(value[0] ?? '').trim(), to: String(value[1] ?? '').trim() }
    return { from: '', to: '' }
  }
  if (value && typeof value === 'object' && 'key' in value) {
    return { key: String(value.key ?? '').trim(), value: String(value.value ?? '').trim() }
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
    if (!condition?.field) return false
    if (conditionHasValue(condition)) return true
    if (isValuelessOperator(condition?.operator || 'eq')) return true
    return false
  })
}

const CONDITION_FIELD_TO_QUERY_KEY = {
  stage: 'stage',
  uploadType: 'uploadType',
  source: 'utm_source',
  utm_source: 'utm_source',
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
  if (getFilterFieldDef(condition?.field) || String(condition?.field || '').startsWith('metadata.')) {
    return serializeFilterConditionForApi(condition)
  }
  const operator = condition?.operator || 'eq'
  const value = normalizeConditionValue(operator, condition?.value)
  return {
    field: condition?.field,
    operator,
    value,
  }
}

export function sanitizeAppliedConditionFilters(filters = {}) {
  return {
    ...filters,
    conditions: getValidConditions(filters.conditions),
  }
}

function buildConditionGroupsPayload(conditions = [], groupLogics = {}, globalLogic = 'AND') {
  const valid = getValidConditions(conditions)
  if (valid.length === 0) return null

  const byGroup = new Map()
  for (const condition of valid) {
    const groupId = condition.groupId || 'ungrouped'
    if (!byGroup.has(groupId)) byGroup.set(groupId, [])
    byGroup.get(groupId).push(serializeConditionForApi(condition))
  }

  const flatConditions = Array.from(byGroup.values()).flat()

  // Flatten if only one group / no group logics were provided — preserves older backend shape.
  if (byGroup.size <= 1 && Object.keys(groupLogics || {}).length === 0) {
    return {
      conditionLogic: globalLogic === 'OR' ? 'OR' : 'AND',
      conditions: flatConditions,
    }
  }

  const groups = Array.from(byGroup.entries()).map(([groupId, groupConditions]) => ({
    id: groupId,
    logic: groupLogics?.[groupId] === 'OR' ? 'OR' : 'AND',
    conditions: groupConditions,
  }))

  return {
    conditionLogic: globalLogic === 'OR' ? 'OR' : 'AND',
    conditions: flatConditions,
    conditionGroups: groups,
  }
}

export function buildQueryParamsFromConditionFilters({
  page,
  limit,
  search = '',
  conditionLogic = 'AND',
  conditions = [],
  groupLogics = {},
}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))

  const trimmedSearch = String(search ?? '').trim()
  if (trimmedSearch) params.set('search', trimmedSearch)

  const payload = buildConditionGroupsPayload(conditions, groupLogics, conditionLogic)
  if (payload) {
    params.set('conditionLogic', payload.conditionLogic)
    params.set('conditions', JSON.stringify(payload.conditions))
    if (payload.conditionGroups?.length) {
      params.set('conditionGroups', JSON.stringify(payload.conditionGroups))
    }

    for (const condition of payload.conditions) {
      const key = CONDITION_FIELD_TO_QUERY_KEY[condition.field]
      if (!key) continue

      if (condition.operator === 'eq' && !Array.isArray(condition.value) && typeof condition.value !== 'object') {
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

/** Convert lead/member filter state into dynamic list conditions (flat API shape). */
export function filtersToConditions(filters = {}) {
  if (Array.isArray(filters?.conditions) && filters.conditions.length > 0) {
    return getValidConditions(filters.conditions).map(serializeConditionForApi)
  }
  return flatFiltersToConditions(filters).map(serializeConditionForApi)
}

/** Same as filtersToConditions but keeps groupId for Save-as-list / form prefills. */
export function filtersToConditionsForForm(filters = {}) {
  if (Array.isArray(filters?.conditions) && filters.conditions.length > 0) {
    return getValidConditions(filters.conditions).map((c) => ({
      ...serializeConditionForApi(c),
      ...(c.groupId ? { groupId: c.groupId } : {}),
      ...(c.id ? { id: c.id } : {}),
    }))
  }
  return flatFiltersToConditions(filters).map(serializeConditionForApi)
}

export function filtersToConditionGroups(filters = {}) {
  const conditions = Array.isArray(filters?.conditions) ? filters.conditions : flatFiltersToConditions(filters)
  return buildConditionGroupsPayload(conditions, filters?.groupLogics || {}, filters?.conditionLogic || 'AND')
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
    groupLogics: filters.groupLogics,
  })
}

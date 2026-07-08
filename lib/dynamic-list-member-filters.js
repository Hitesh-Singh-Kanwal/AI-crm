import {
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
} from '@/lib/dynamic-list-constants'
import { buildQueryParamsFromConditionFilters } from '@/lib/lead-filter-fields'
import {
  SEARCH_FILTER_DEF,
  flatFilterHasValue,
  flatFiltersToConditions,
  getFlatFilterOperator,
  getFlatFilterValues,
  usesMultiValueOperator as flatUsesMultiValue,
} from '@/lib/lead-flat-filters'
import { conditionHasValue } from '@/lib/dynamic-list-filter-catalog'
import { summarizeCondition } from '@/lib/dynamic-list-normalize'

export const MEMBER_BOOKING_STATUS_OPTIONS = ['Not Booked', 'Booked']

export const FORM_SUBMISSION_UPLOAD_TYPE = 'form_submission'

const CONDITION_TO_FILTER_FIELD = {
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
  withinDays: 'relativeCreated',
  olderThanDays: 'relativeCreated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

export const EMPTY_MEMBER_FILTERS = {
  search: '',
  searchOperator: 'eq',
  conditionLogic: 'AND',
  conditions: [],
}

function getConditionValues(condition) {
  const operator = condition?.operator || 'eq'
  const value = condition?.value

  if (operator === 'in' || operator === 'ne' || operator === 'not_in') {
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

export function getHiddenMemberFilterFields(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  const hidden = new Set()

  for (const condition of conditions) {
    const filterKey = CONDITION_TO_FILTER_FIELD[condition?.field] || condition?.field
    if (filterKey && isFixedCondition(condition)) {
      hidden.add(filterKey)
      if (condition.field === 'withinDays' || condition.field === 'olderThanDays' || condition.field === 'createdAt') {
        hidden.add('relativeCreated')
        hidden.add('relativeCreatedDays')
        hidden.add('dateRangePreset')
        hidden.add('createdAt')
      }
    }
  }

  if (listHasSourceCondition(list) || listHasFormSubmissionCondition(list)) {
    hidden.add('uploadType')
  }

  return hidden
}

export function getHiddenConditionFields(list) {
  const hidden = getHiddenMemberFilterFields(list)
  const mapped = new Set()
  for (const [field, filterKey] of Object.entries(CONDITION_TO_FILTER_FIELD)) {
    if (hidden.has(filterKey)) mapped.add(field)
  }
  if (hidden.has('uploadType')) mapped.add('uploadType')
  return mapped
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
  return conditions.some((condition) => condition?.field === 'source' || condition?.field === 'utm_source')
}

export function uploadFiltersIncludeFormSubmission(filters) {
  const conditions = Array.isArray(filters?.conditions) ? filters.conditions : []
  return conditions.some((condition) => {
    if (condition?.field !== 'uploadType') return false
    const operator = condition?.operator || 'eq'
    const values = getConditionValues(condition)
    if (operator === 'eq') return values[0] === FORM_SUBMISSION_UPLOAD_TYPE
    if (operator === 'in') return values.includes(FORM_SUBMISSION_UPLOAD_TYPE)
    if (operator === 'ne' || operator === 'not_in') {
      return values.length > 0 && !values.includes(FORM_SUBMISSION_UPLOAD_TYPE)
    }
    return false
  })
}

export function shouldShowSourceFilter(list, filters) {
  if (uploadFiltersIncludeFormSubmission(filters)) return true
  return listHasFormSubmissionCondition(list)
}

export function shouldShowFormFilter(list, filters) {
  if (listHasSourceCondition(list)) return true
  if (uploadFiltersIncludeFormSubmission(filters)) return true
  return listHasFormSubmissionCondition(list)
}

export function sanitizeMemberFilters(list, filters) {
  const hidden = getHiddenMemberFilterFields(list)
  let next = {
    ...filters,
    search: filters?.search ?? '',
    searchOperator: filters?.searchOperator || 'eq',
    conditionLogic: filters?.conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions: Array.isArray(filters?.conditions) ? filters.conditions : [],
  }

  if (Array.isArray(next.conditions) && next.conditions.length > 0 && hidden.size > 0) {
    next.conditions = next.conditions.filter((c) => {
      const filterKey = CONDITION_TO_FILTER_FIELD[c.field] || c.field
      return !hidden.has(filterKey) && !hidden.has(c.field)
    })
  }

  return next
}

export function buildMemberFilterParams({ page, limit, filters }) {
  const conditions = flatFiltersToConditions(filters)
  const searchOperator = filters?.searchOperator || 'eq'
  const searchParam =
    searchOperator === 'eq' && !Array.isArray(filters?.search)
      ? String(filters?.search ?? '')
      : ''

  return buildQueryParamsFromConditionFilters({
    page,
    limit,
    search: searchParam,
    conditionLogic: filters?.conditionLogic,
    conditions,
  })
}

export function hasActiveMemberFilters(filters) {
  if (!filters) return false

  const searchOperator = getFlatFilterOperator(filters, SEARCH_FILTER_DEF.operatorKey)
  const searchValue = getFlatFilterValues(filters, SEARCH_FILTER_DEF.filterKey, SEARCH_FILTER_DEF.operatorKey)
  if (flatFilterHasValue(searchValue, searchOperator)) return true

  if (Array.isArray(filters.conditions) && filters.conditions.some(conditionHasValue)) return true

  return false
}

export const DATE_RANGE_PRESETS = [
  { value: '', label: 'All time' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

export function getDateRangePresetValue(filters) {
  return filters?.dateRangePreset || ''
}

export function applyDateRangePreset(preset, filters) {
  return { ...filters, dateRangePreset: preset }
}

export function countAdvancedMemberFilters(filters, list = null) {
  if (!filters) return 0
  const hidden = getHiddenMemberFilterFields(list)
  const conditions = Array.isArray(filters.conditions) ? filters.conditions : []
  return conditions.filter((c) => {
    if (!conditionHasValue(c)) return false
    const filterKey = CONDITION_TO_FILTER_FIELD[c.field] || c.field
    if (hidden.has(filterKey) || hidden.has(c.field)) return false
    return true
  }).length
}

export function getActiveMemberFilterChips(filters, { locations = [], forms = [], leadReasons = [], list = null } = {}) {
  if (!filters) return []
  const chips = []
  const hidden = getHiddenMemberFilterFields(list)
  const context = { leadReasons, locations, forms }

  const push = (id, label, keys) => chips.push({ id, label, keys })

  const searchOperator = getFlatFilterOperator(filters, SEARCH_FILTER_DEF.operatorKey)
  const searchValue = getFlatFilterValues(filters, SEARCH_FILTER_DEF.filterKey, SEARCH_FILTER_DEF.operatorKey)

  if (flatFilterHasValue(searchValue, searchOperator)) {
    push(
      'search',
      summarizeCondition(
        {
          field: 'search',
          operator: searchOperator,
          value: flatUsesMultiValue(searchOperator) ? searchValue : String(searchValue),
        },
        context
      ),
      ['search', SEARCH_FILTER_DEF.operatorKey]
    )
  }

  const conditions = Array.isArray(filters.conditions) ? filters.conditions : []
  conditions.forEach((condition, index) => {
    if (!conditionHasValue(condition)) return
    const filterKey = CONDITION_TO_FILTER_FIELD[condition.field] || condition.field
    if (hidden.has(filterKey) || hidden.has(condition.field)) return
    push(
      condition.id || `${condition.field}-${index}`,
      summarizeCondition(condition, context),
      ['conditions', condition.id || String(index)]
    )
  })

  const activeCount =
    conditions.filter(conditionHasValue).length + (flatFilterHasValue(searchValue, searchOperator) ? 1 : 0)
  if (activeCount > 1) {
    chips.push({
      id: 'condition-logic',
      label: `Match: ${filters.conditionLogic || 'AND'}`,
      keys: [],
      locked: true,
    })
  }

  return chips
}

export function removeMemberFilterKeys(filters, keys = []) {
  let next = { ...filters }

  if (keys.includes('search') || keys.includes(SEARCH_FILTER_DEF.operatorKey)) {
    next.search = ''
    next.searchOperator = 'eq'
  }

  if (keys.includes('conditions')) {
    const conditionId = keys.find((k) => k !== 'conditions')
    if (conditionId != null) {
      next.conditions = (Array.isArray(next.conditions) ? next.conditions : []).filter((c, index) => {
        if (c.id) return c.id !== conditionId
        return String(index) !== String(conditionId)
      })
    } else {
      next.conditions = []
    }
  }

  return next
}

export function removeFilterChip(filters, chip) {
  if (chip?.locked) return filters
  if (chip?.keys?.length) return removeMemberFilterKeys(filters, chip.keys)
  return filters
}

export { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS }

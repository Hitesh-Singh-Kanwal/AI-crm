import { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'
import {
  buildQueryParamsFromConditionFilters,
  getValidConditions,
} from '@/lib/lead-filter-fields'
import {
  ALL_OPERATOR_FILTER_DEFS,
  SEARCH_FILTER_DEF,
  clearFlatFilterField,
  flatFilterHasValue,
  flatFiltersToConditions,
  getFlatFilterOperator,
  getFlatFilterValues,
  usesMultiValueOperator,
} from '@/lib/lead-flat-filters'
import { summarizeCondition } from '@/lib/dynamic-list-normalize'

export const MEMBER_BOOKING_STATUS_OPTIONS = ['Not Booked', 'Booked']

export const FORM_SUBMISSION_UPLOAD_TYPE = 'form_submission'

const CONDITION_TO_FILTER_FIELD = {
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
  withinDays: 'relativeCreated',
  olderThanDays: 'relativeCreated',
}

export const EMPTY_MEMBER_FILTERS = {
  search: '',
  searchOperator: 'eq',
  conditionLogic: 'AND',
  stage: '',
  stageOperator: 'eq',
  uploadType: '',
  uploadTypeOperator: 'eq',
  bookingStatus: '',
  bookingStatusOperator: 'eq',
  utm_source: '',
  sourceOperator: 'eq',
  reason: '',
  reasonOperator: 'eq',
  locationID: '',
  locationOperator: 'eq',
  formID: '',
  formOperator: 'eq',
  isEscalated: '',
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

export function getHiddenMemberFilterFields(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  const hidden = new Set()

  for (const condition of conditions) {
    const filterKey = CONDITION_TO_FILTER_FIELD[condition?.field]
    if (filterKey && isFixedCondition(condition)) {
      hidden.add(filterKey)
      if (condition.field === 'withinDays' || condition.field === 'olderThanDays') {
        hidden.add('relativeCreated')
        hidden.add('relativeCreatedDays')
        hidden.add('dateRangePreset')
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
  return conditions.some((condition) => condition?.field === 'source')
}

export function uploadFiltersIncludeFormSubmission(filters) {
  const operator = getFlatFilterOperator(filters, 'uploadTypeOperator')
  const uploadType = getFlatFilterValues(filters, 'uploadType', 'uploadTypeOperator')
  if (operator === 'eq') return uploadType === FORM_SUBMISSION_UPLOAD_TYPE
  if (operator === 'in') {
    return Array.isArray(uploadType) && uploadType.includes(FORM_SUBMISSION_UPLOAD_TYPE)
  }
  if (operator === 'ne') {
    if (!Array.isArray(uploadType) || uploadType.length === 0) return true
    return !uploadType.includes(FORM_SUBMISSION_UPLOAD_TYPE)
  }
  return false
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
  let next = { ...filters }

  for (const key of hidden) {
    if (key in next) next[key] = ''
    const def = ALL_OPERATOR_FILTER_DEFS.find((d) => d.filterKey === key)
    if (def) next[def.operatorKey] = 'eq'
  }

  if (!shouldShowSourceFilter(list, next)) {
    next.utm_source = ''
    next.sourceOperator = 'eq'
  }

  if (!shouldShowFormFilter(list, next)) {
    next.formID = ''
    next.formOperator = 'eq'
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

  for (const def of ALL_OPERATOR_FILTER_DEFS) {
    const operator = getFlatFilterOperator(filters, def.operatorKey)
    const value = getFlatFilterValues(filters, def.filterKey, def.operatorKey)
    if (flatFilterHasValue(value, operator)) return true
  }

  const hasRelative =
    Boolean(filters.relativeCreated) && parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10) >= 1
  if (hasRelative) return true

  if (filters.isEscalated === true || filters.isEscalated === 'true') return true

  return ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'].some((key) =>
    String(filters[key] ?? '').trim()
  )
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

const QUICK_FILTER_KEYS = new Set(['search'])

export function countAdvancedMemberFilters(filters, list = null) {
  if (!filters) return 0
  const hidden = getHiddenMemberFilterFields(list)
  let count = 0

  const checkOperatorField = (filterKey, operatorKey) => {
    if (QUICK_FILTER_KEYS.has(filterKey)) return
    if (hidden.has(filterKey)) return
    if (filterKey === 'utm_source' && !shouldShowSourceFilter(list, filters)) return
    if (filterKey === 'formID' && !shouldShowFormFilter(list, filters)) return
    const operator = getFlatFilterOperator(filters, operatorKey)
    const value = getFlatFilterValues(filters, filterKey, operatorKey)
    if (flatFilterHasValue(value, operator)) count += 1
  }

  for (const def of ALL_OPERATOR_FILTER_DEFS) {
    if (QUICK_FILTER_KEYS.has(def.filterKey)) continue
    checkOperatorField(def.filterKey, def.operatorKey)
  }

  const hasRelative =
    Boolean(filters.relativeCreated) &&
    parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10) >= 1
  if (hasRelative) count += 1

  for (const key of ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo']) {
    if (String(filters[key] ?? '').trim()) count += 1
  }

  if (filters.isEscalated === true || filters.isEscalated === 'true') count += 1

  return count
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
          value: usesMultiValueOperator(searchOperator) ? searchValue : String(searchValue),
        },
        context
      ),
      ['search', SEARCH_FILTER_DEF.operatorKey]
    )
  }

  for (const def of ALL_OPERATOR_FILTER_DEFS) {
    if (hidden.has(def.filterKey)) continue
    if (def.filterKey === 'utm_source' && !shouldShowSourceFilter(list, filters)) continue
    if (def.filterKey === 'formID' && !shouldShowFormFilter(list, filters)) continue

    const operator = getFlatFilterOperator(filters, def.operatorKey)
    const value = getFlatFilterValues(filters, def.filterKey, def.operatorKey)
    if (!flatFilterHasValue(value, operator)) continue

    push(def.filterKey, summarizeCondition({
      field: def.conditionField,
      operator,
      value: usesMultiValueOperator(operator) ? value : String(value),
    }, context), [def.filterKey, def.operatorKey])
  }

  const days = parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10)
  if (filters.relativeCreated === 'after' && days >= 1) {
    push('relativeCreated', `Last ${days} day${days === 1 ? '' : 's'}`, ['relativeCreated', 'relativeCreatedDays', 'dateRangePreset'])
  } else if (filters.relativeCreated === 'before' && days >= 1) {
    push('relativeCreated', `Older than ${days} day${days === 1 ? '' : 's'}`, ['relativeCreated', 'relativeCreatedDays', 'dateRangePreset'])
  }

  for (const key of ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo']) {
    if (String(filters[key] ?? '').trim()) {
      push(key, summarizeCondition({ field: key, operator: 'eq', value: filters[key] }, context), [key])
    }
  }

  if (filters.isEscalated === true || filters.isEscalated === 'true') {
    push('isEscalated', 'Escalated', ['isEscalated'])
  }

  const activeRules = flatFiltersToConditions(filters)
  if (activeRules.length > 1) {
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

  for (const key of keys) {
    if (key === 'search') {
      next.search = ''
      next.searchOperator = 'eq'
      continue
    }
    if (key in next) {
      next = clearFlatFilterField(next, key)
    }
    const def = ALL_OPERATOR_FILTER_DEFS.find((d) => d.operatorKey === key)
    if (def) next[def.operatorKey] = 'eq'
  }

  if (keys.includes('relativeCreated') || keys.includes('relativeCreatedDays')) {
    next.relativeCreated = ''
    next.relativeCreatedDays = ''
  }
  if (keys.includes('isEscalated')) {
    next.isEscalated = ''
  }
  if (
    keys.some((key) =>
      ['relativeCreated', 'relativeCreatedDays', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'dateRangePreset'].includes(key)
    )
  ) {
    next.dateRangePreset = hasAnyDateFilterValues(next) ? 'custom' : ''
  }

  return next
}

export function removeFilterChip(filters, chip) {
  if (chip?.locked) return filters
  if (chip?.keys?.length) return removeMemberFilterKeys(filters, chip.keys)
  return filters
}

export { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS }

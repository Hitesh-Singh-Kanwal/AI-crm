import { normalizeConditionValue } from '@/lib/dynamic-list-normalize'

export const FILTER_OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Exclude' },
  { value: 'in', label: 'In' },
]

/** Flat filter fields that support Equals / Exclude / In in the filter sidebar. */
export const OPERATOR_FILTER_FIELD_DEFS = [
  { filterKey: 'bookingStatus', conditionField: 'bookingStatus', operatorKey: 'bookingStatusOperator', optionsKey: 'bookingStatus' },
  { filterKey: 'reason', conditionField: 'reason', operatorKey: 'reasonOperator', optionsKey: 'reason' },
  { filterKey: 'utm_source', conditionField: 'source', operatorKey: 'sourceOperator', optionsKey: 'source' },
  { filterKey: 'locationID', conditionField: 'locationID', operatorKey: 'locationOperator', optionsKey: 'locations' },
  { filterKey: 'formID', conditionField: 'formID', operatorKey: 'formOperator', optionsKey: 'forms' },
]

export const QUICK_FILTER_OPERATOR_DEFS = [
  { filterKey: 'stage', conditionField: 'stage', operatorKey: 'stageOperator', optionsKey: 'stage' },
  { filterKey: 'uploadType', conditionField: 'uploadType', operatorKey: 'uploadTypeOperator', optionsKey: 'uploadType' },
]

export const ALL_OPERATOR_FILTER_DEFS = [...QUICK_FILTER_OPERATOR_DEFS, ...OPERATOR_FILTER_FIELD_DEFS]

export function flatFilterHasValue(value, operator = 'eq') {
  if (operator === 'in') {
    if (Array.isArray(value)) return value.length > 0
    return String(value ?? '').trim() !== ''
  }
  if (Array.isArray(value)) return String(value[0] ?? '').trim() !== ''
  return String(value ?? '').trim() !== ''
}

export function getFlatFilterOperator(filters, operatorKey) {
  return filters?.[operatorKey] || 'eq'
}

export function getFlatFilterValues(filters, filterKey, operatorKey) {
  const operator = getFlatFilterOperator(filters, operatorKey)
  const value = filters?.[filterKey]
  if (operator === 'in') {
    if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
    if (String(value ?? '').trim()) return [String(value)]
    return []
  }
  if (Array.isArray(value)) return String(value[0] ?? '')
  return String(value ?? '')
}

export function updateFlatFilterOperator(filters, filterKey, operatorKey, operator) {
  const next = { ...filters, [operatorKey]: operator }
  const current = filters?.[filterKey]

  if (operator === 'in') {
    next[filterKey] = Array.isArray(current)
      ? current
      : String(current ?? '').trim()
        ? [String(current)]
        : []
  } else {
    next[filterKey] = Array.isArray(current) ? String(current[0] ?? '') : String(current ?? '')
  }

  return next
}

export function updateFlatFilterValue(filters, filterKey, operatorKey, value) {
  return { ...filters, [filterKey]: value }
}

export function flatFiltersToConditions(filters = {}) {
  const conditions = []

  for (const def of ALL_OPERATOR_FILTER_DEFS) {
    const operator = getFlatFilterOperator(filters, def.operatorKey)
    const value = getFlatFilterValues(filters, def.filterKey, def.operatorKey)
    if (!flatFilterHasValue(value, operator)) continue
    conditions.push({
      field: def.conditionField,
      operator,
      value: operator === 'in' ? normalizeConditionValue('in', value) : String(value),
    })
  }

  if (filters.isEscalated === true || filters.isEscalated === 'true') {
    conditions.push({ field: 'isEscalated', operator: 'eq', value: 'true' })
  }

  const days = parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10)
  if (Number.isFinite(days) && days >= 1) {
    if (filters.relativeCreated === 'after') {
      conditions.push({ field: 'withinDays', operator: 'eq', value: String(days) })
    } else if (filters.relativeCreated === 'before') {
      conditions.push({ field: 'olderThanDays', operator: 'eq', value: String(days) })
    }
  }

  const pushEq = (field, value) => {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return
    conditions.push({ field, operator: 'eq', value: trimmed })
  }

  pushEq('createdFrom', filters.createdFrom)
  pushEq('createdTo', filters.createdTo)
  pushEq('updatedFrom', filters.updatedFrom)
  pushEq('updatedTo', filters.updatedTo)

  return conditions
}

export function countActiveFlatFilterFields(filters, { list = null, hiddenFields = new Set(), skipQuick = true } = {}) {
  const quick = skipQuick ? new Set(['stage', 'uploadType']) : new Set()
  let count = 0

  for (const def of ALL_OPERATOR_FILTER_DEFS) {
    if (quick.has(def.filterKey)) continue
    if (hiddenFields.has(def.filterKey)) continue
    const operator = getFlatFilterOperator(filters, def.operatorKey)
    const value = getFlatFilterValues(filters, def.filterKey, def.operatorKey)
    if (flatFilterHasValue(value, operator)) count += 1
  }

  if (String(filters.bookingStatus ?? '').trim() || (Array.isArray(filters.bookingStatus) && filters.bookingStatus.length)) {
    // counted above
  }

  const hasRelative =
    Boolean(filters.relativeCreated) && parseInt(String(filters.relativeCreatedDays ?? '').trim(), 10) >= 1
  if (hasRelative) count += 1

  const dateKeys = ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo']
  for (const key of dateKeys) {
    if (String(filters[key] ?? '').trim()) count += 1
  }

  if (filters.isEscalated === true || filters.isEscalated === 'true') count += 1

  return count
}

export function clearFlatFilterField(filters, filterKey) {
  const next = { ...filters, [filterKey]: '' }
  const def = ALL_OPERATOR_FILTER_DEFS.find((d) => d.filterKey === filterKey)
  if (def) next[def.operatorKey] = 'eq'
  return next
}

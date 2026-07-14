import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import {
  ALL_CUSTOMER_FILTER_FIELDS,
  CUSTOMER_FILTER_GROUPS,
  FILTER_OPERATORS,
  conditionHasValue,
  getCustomerFilterFieldDef,
  getDefaultOperatorForCustomerField,
  getOperatorsForCustomerFilterField,
  isValuelessOperator,
  normalizeFilterConditionValue,
  serializeCustomerFilterConditionForApi,
  usesMultiValueOperator,
} from '@/lib/customer-list-filter-catalog'

export const CUSTOMER_CONDITION_FIELDS = ALL_CUSTOMER_FILTER_FIELDS.map(({ value, label }) => ({
  value,
  label,
}))

export const CUSTOMER_CONDITION_OPERATORS = FILTER_OPERATORS

export function getConditionFieldDef(field) {
  if (String(field || '').startsWith('customFields.')) {
    return getCustomerFilterFieldDef('customFields')
  }
  return getCustomerFilterFieldDef(field)
}

export function getOperatorsForField(field) {
  return getOperatorsForCustomerFilterField(field)
}

export function normalizeConditionValue(operator, value) {
  return normalizeFilterConditionValue(operator, value)
}

function toLabeledOptions(values = []) {
  return values.map((value) => ({
    value,
    label: formatFieldDisplayValue(value),
  }))
}

export function getFieldValueOptions(field, context = {}) {
  const { locations = [], teachers = [], tags = [], memberships = [] } = context
  const def = getConditionFieldDef(field)
  if (!def) return null

  if (def.optionsKey === 'locations' || field === 'locationID') {
    return locations.map((loc) => ({ value: loc._id, label: loc.name || loc._id }))
  }
  if (def.optionsKey === 'teachers' || field === 'enrollment.teacherID') {
    return teachers.map((t) => ({ value: t._id, label: t.name || t._id }))
  }
  if (def.optionsKey === 'tags' || field === 'tags') {
    return (tags || []).map((tag) => ({
      value: typeof tag === 'string' ? tag : tag.name || tag._id,
      label: typeof tag === 'string' ? tag : tag.name || tag._id,
    }))
  }
  if (def.optionsKey === 'memberships' || field === 'membership.membershipName') {
    return memberships.map((m) => ({ value: m.name || m._id, label: m.name || m._id }))
  }
  if (def.staticOptions) {
    return toLabeledOptions(
      def.staticOptions.map((opt) => (typeof opt === 'string' ? opt : opt.value))
    )
  }
  return null
}

export function formatConditionValueLabel(field, value, context = {}) {
  const options = getFieldValueOptions(field, context)
  if (options && (Array.isArray(value) ? value.length > 0 : value)) {
    const values = Array.isArray(value) ? value : [value]
    return values
      .map((v) => options.find((o) => String(o.value) === String(v))?.label || String(v))
      .join(', ')
  }
  if (value && typeof value === 'object' && 'key' in value) {
    return `${value.key}: ${value.value}`
  }
  return formatFieldDisplayValue(String(value ?? ''))
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

function serializeConditionForApi(condition) {
  return serializeCustomerFilterConditionForApi(condition)
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

export function buildCustomerQueryParams({ page, limit, filters = {} }) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))

  const search = String(filters?.search ?? '').trim()
  if (search) params.set('search', search)
  if (filters?.teacherID) params.set('teacherID', filters.teacherID)

  const conditions = Array.isArray(filters?.conditions) ? filters.conditions : []
  const payload = buildConditionGroupsPayload(
    conditions,
    filters?.groupLogics || {},
    filters?.conditionLogic || 'AND'
  )

  if (payload) {
    params.set('conditionLogic', payload.conditionLogic)
    params.set('conditions', JSON.stringify(payload.conditions))
    if (payload.conditionGroups?.length) {
      params.set('conditionGroups', JSON.stringify(payload.conditionGroups))
    }
  }

  return params
}

export function filtersToConditionsForForm(filters = {}) {
  if (!Array.isArray(filters?.conditions)) return []
  return getValidConditions(filters.conditions).map((c) => ({
    ...serializeConditionForApi(c),
    ...(c.groupId ? { groupId: c.groupId } : {}),
    ...(c.id ? { id: c.id } : {}),
  }))
}

export { CUSTOMER_FILTER_GROUPS, conditionHasValue, getDefaultOperatorForCustomerField as getDefaultOperatorForField }

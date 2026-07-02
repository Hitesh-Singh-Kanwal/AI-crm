import { STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  if (s === 'inactive') return 'bg-muted text-muted-foreground'
  return 'bg-muted text-muted-foreground'
}

export function getListId(list) {
  if (!list) return ''
  if (typeof list === 'string') return list
  return list._id || list.id || ''
}

export function getListName(list) {
  if (!list || typeof list === 'string') return ''
  return list.name || ''
}

export function formatReasonLabel(reason) {
  if (reason === null || reason === undefined || String(reason).trim() === '') {
    return 'Default (any reason)'
  }
  return String(reason)
}

export function getFieldValueOptions(field) {
  if (field === 'stage') return STAGE_OPTIONS
  if (field === 'uploadType') return UPLOAD_TYPE_OPTIONS
  return null
}

export function createEmptyCondition() {
  return { field: 'stage', operator: 'eq', value: '' }
}

export function normalizeConditionValue(operator, value) {
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
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return String(value ?? '').trim()
}

export function normalizeConditionsForForm(conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return [createEmptyCondition()]
  return conditions.map((c) => {
    const operator = c?.operator || 'eq'
    const value = normalizeConditionValue(operator, c?.value)
    return {
      field: c?.field || 'stage',
      operator,
      value: operator === 'in' ? value : String(value || ''),
    }
  })
}

export function normalizeDynamicListFromApi(list) {
  if (!list || typeof list !== 'object') return null
  return {
    ...list,
    _id: list._id || list.id,
    name: String(list.name ?? ''),
    description: String(list.description ?? ''),
    status: list.status === 'inactive' ? 'inactive' : 'active',
    conditionLogic: list.conditionLogic === 'OR' ? 'OR' : 'AND',
    isFavorite: Boolean(list.isFavorite),
    memberCount: Number(list.memberCount ?? 0),
    conditions: normalizeConditionsForForm(list.conditions),
  }
}

export function buildDynamicListPayload(form) {
  const conditions = (form.conditions || [])
    .map((c) => {
      const operator = c.operator || 'eq'
      const value = normalizeConditionValue(operator, c.value)
      return {
        field: c.field,
        operator,
        value: operator === 'in' ? value : String(value || ''),
      }
    })
    .filter((c) => {
      if (c.operator === 'in') return Array.isArray(c.value) && c.value.length > 0
      return String(c.value || '').trim() !== ''
    })

  return {
    name: String(form.name || '').trim(),
    description: String(form.description || '').trim(),
    conditionLogic: form.conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions,
    status: form.status === 'inactive' ? 'inactive' : 'active',
  }
}

export function summarizeCondition(condition) {
  const field = condition?.field || 'field'
  const operator = condition?.operator || 'eq'
  const value = condition?.value
  if (operator === 'in' && Array.isArray(value)) {
    return `${field} is one of [${value.join(', ')}]`
  }
  const opLabel = operator === 'eq' ? '=' : operator === 'ne' ? '≠' : operator
  return `${field} ${opLabel} ${Array.isArray(value) ? value.join(', ') : value}`
}

export function summarizeConditions(list) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  if (conditions.length === 0) return 'No conditions'
  const logic = list?.conditionLogic === 'OR' ? ' OR ' : ' AND '
  return conditions.map(summarizeCondition).join(logic)
}

export function extractDynamicListsList(result) {
  const data = result?.data
  if (Array.isArray(data?.lists)) return data.lists
  if (Array.isArray(data)) return data
  return []
}

export function groupWorkflowsByListId(workflows = []) {
  const map = new Map()
  for (const wf of workflows) {
    const listId = getListId(wf?.listID)
    if (!listId) continue
    if (!map.has(listId)) map.set(listId, [])
    map.get(listId).push(wf)
  }
  return map
}

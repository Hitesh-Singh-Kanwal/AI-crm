import { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'

/** Display: replace _ and - with space, capitalize first letter of each word. */
export function formatFieldDisplayValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''
  return str
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toLabeledOptions(values = []) {
  return values.map((value) => ({
    value,
    label: formatFieldDisplayValue(value),
  }))
}

export function getMembershipLead(membership) {
  const lead = membership?.leadID || membership?.lead || {}
  const id = lead._id || lead.id || ''
  if (!id) return null
  return {
    _id: id,
    name: lead.name || '',
    email: lead.email || '',
    phoneNumber: lead.phoneNumber || '',
  }
}

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

export function formatReasonLabel(reason, leadReasons = []) {
  if (reason === null || reason === undefined || String(reason).trim() === '') {
    return 'Default (any reason)'
  }
  const match = getLeadReasonOptions(leadReasons).find((o) => o.value === reason)
  if (match?.label) return match.label
  return formatFieldDisplayValue(reason)
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

export function getFieldValueOptions(field, leadReasons = []) {
  if (field === 'stage') return toLabeledOptions(STAGE_OPTIONS)
  if (field === 'uploadType') return toLabeledOptions(UPLOAD_TYPE_OPTIONS)
  if (field === 'source') return toLabeledOptions(SOURCE_OPTIONS)
  if (field === 'reason') return getLeadReasonOptions(leadReasons)
  return null
}

export function formatConditionValueLabel(field, value, leadReasons = []) {
  const values = Array.isArray(value) ? value : [value]
  const options = getFieldValueOptions(field, leadReasons) || []
  return values
    .map((v) => {
      const match = options.find((o) => o.value === v)
      if (match) return match.label
      return formatFieldDisplayValue(v)
    })
    .join(', ')
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

export function summarizeCondition(condition, leadReasons = []) {
  const field = formatFieldDisplayValue(condition?.field || 'field')
  const operator = condition?.operator || 'eq'
  const value = condition?.value
  const formatValue = (v) => formatConditionValueLabel(condition?.field, v, leadReasons)
  if (operator === 'in' && Array.isArray(value)) {
    return `${field} is one of [${value.map(formatValue).join(', ')}]`
  }
  const opLabel = operator === 'eq' ? '=' : operator === 'ne' ? '≠' : operator
  const display = Array.isArray(value) ? value.map(formatValue).join(', ') : formatValue(value)
  return `${field} ${opLabel} ${display}`
}

export function summarizeConditions(list, leadReasons = []) {
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  if (conditions.length === 0) return 'No conditions'
  const logic = list?.conditionLogic === 'OR' ? ' OR ' : ' AND '
  return conditions.map((c) => summarizeCondition(c, leadReasons)).join(logic)
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

import {
  formatConditionValueLabel as formatConditionValueLabelFromFields,
  getConditionFieldDef,
  getFieldValueOptions as getFieldValueOptionsFromFields,
  getLeadReasonOptions as getLeadReasonOptionsFromFields,
  normalizeConditionValue as normalizeConditionValueFromFields,
} from '@/lib/lead-filter-fields'

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

export function getMembershipLead(membership) {
  const lead = membership?.leadID || membership?.lead || {}
  const id = lead._id || lead.id || ''
  if (!id) return null
  return {
    _id: id,
    name: lead.name || '',
    email: lead.email || '',
    phoneNumber: lead.phoneNumber || '',
    stage: lead.stage || '',
    uploadType: lead.uploadType || '',
    reason: lead.reason || '',
    location: lead.location || '',
    locationID: lead.locationID || '',
    utm_source: lead.utm_source || lead.source || '',
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
  return getLeadReasonOptionsFromFields(leadReasons)
}

export function getFieldValueOptions(field, context = {}) {
  const leadReasons = Array.isArray(context) ? context : context?.leadReasons || []
  const locations = context?.locations || []
  const forms = context?.forms || []
  return getFieldValueOptionsFromFields(field, { leadReasons, locations, forms })
}

export function formatConditionValueLabel(field, value, context = {}) {
  const leadReasons = Array.isArray(context) ? context : context?.leadReasons || []
  const locations = context?.locations || []
  const forms = context?.forms || []
  return formatConditionValueLabelFromFields(field, value, { leadReasons, locations, forms })
}

export function createEmptyCondition() {
  return { field: 'stage', operator: 'eq', value: '' }
}

export function normalizeConditionValue(operator, value) {
  return normalizeConditionValueFromFields(operator, value)
}

export function normalizeConditionsForForm(conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return [createEmptyCondition()]
  return conditions.map((c) => {
    const operator = c?.operator || 'eq'
    const value = normalizeConditionValue(operator, c?.value)
    return {
      field: c?.field || 'stage',
      operator,
      value: operator === 'in' || operator === 'ne' ? value : String(value || ''),
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
        value: operator === 'in' || operator === 'ne' ? value : String(value || ''),
      }
    })
    .filter((c) => {
      if (c.operator === 'in' || c.operator === 'ne') {
        return Array.isArray(c.value) && c.value.length > 0
      }
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

export function summarizeCondition(condition, context = {}) {
  const leadReasons = Array.isArray(context) ? context : context?.leadReasons || []
  const locations = context?.locations || []
  const forms = context?.forms || []
  const fieldDef = getConditionFieldDef(condition?.field)
  const field = fieldDef?.label || formatFieldDisplayValue(condition?.field || 'field')
  const operator = condition?.operator || 'eq'
  const value = condition?.value
  const formatValue = (v) => formatConditionValueLabel(condition?.field, v, { leadReasons, locations, forms })
  if (operator === 'in' && Array.isArray(value)) {
    return `${field} is one of [${value.map(formatValue).join(', ')}]`
  }
  if (operator === 'ne' && Array.isArray(value)) {
    const display = value.map(formatValue).join(', ')
    return condition?.field === 'search'
      ? `Search exclude [${display}]`
      : `${field} exclude [${display}]`
  }
  const opLabel = operator === 'eq' ? '=' : operator === 'ne' ? 'exclude' : operator
  const display = Array.isArray(value) ? value.map(formatValue).join(', ') : formatValue(value)
  return `${field} ${opLabel} ${display}`
}

export function summarizeConditions(list, context = {}) {
  const leadReasons = Array.isArray(context) ? context : context?.leadReasons || []
  const locations = context?.locations || []
  const forms = context?.forms || []
  const conditions = Array.isArray(list?.conditions) ? list.conditions : []
  if (conditions.length === 0) return 'No conditions'
  const logic = list?.conditionLogic === 'OR' ? ' OR ' : ' AND '
  return conditions
    .map((c) => summarizeCondition(c, { leadReasons, locations, forms }))
    .join(logic)
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

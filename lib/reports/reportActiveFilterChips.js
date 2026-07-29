import { OPERATOR_LABEL_MAP } from '@/lib/dynamic-list-filter-catalog'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import { DASHBOARD_DETAILS_FILTER_CATALOGS, REPORT_FILTER_CATALOGS } from '@/lib/report-filter-catalogs'
import { buildCatalogFromColumns } from '@/lib/reports/buildCatalogFromColumns'

function getValidReportConditions(conditions = []) {
  return (conditions || []).filter((c) => {
    if (!c?.field) return false
    if (typeof c.value === 'object' && c.value && !Array.isArray(c.value)) {
      return String(c.value.from ?? '').trim() !== '' && String(c.value.to ?? '').trim() !== ''
    }
    if (Array.isArray(c.value)) return c.value.length > 0
    return String(c.value ?? '').trim() !== ''
  })
}

function resolveCatalog(catalogKey, columns) {
  return (
    DASHBOARD_DETAILS_FILTER_CATALOGS[catalogKey] ||
    REPORT_FILTER_CATALOGS[catalogKey] ||
    buildCatalogFromColumns(columns) ||
    null
  )
}

function optionLabel(options = [], id) {
  const match = options.find((o) => String(o.id) === String(id))
  return match?.label || id
}

function formatConditionValue(value, fieldDef) {
  if (Array.isArray(value)) return value.map((v) => formatConditionValue(v, fieldDef)).join(', ')
  if (value && typeof value === 'object') {
    const from = value.from ?? ''
    const to = value.to ?? ''
    return `${from} – ${to}`
  }
  const raw = String(value ?? '')
  const opts = fieldDef?.staticOptions
  if (Array.isArray(opts)) {
    const hit = opts.find((o) => (typeof o === 'string' ? o === raw : String(o.value) === raw))
    if (hit) return typeof hit === 'string' ? formatFieldDisplayValue(hit) : hit.label || formatFieldDisplayValue(hit.value)
  }
  if (raw === 'true') return 'Yes'
  if (raw === 'false') return 'No'
  return formatFieldDisplayValue(raw)
}

function summarizeReportCondition(condition, catalog) {
  const fieldDef = catalog?.getFilterFieldDef?.(condition.field)
  const fieldLabel = fieldDef?.label || formatFieldDisplayValue(condition.field)
  const op = condition.operator || 'eq'
  const opLabel = OPERATOR_LABEL_MAP[op] || op
  if (op === 'between') {
    return `${fieldLabel}: ${formatConditionValue(condition.value, fieldDef)}`
  }
  return `${fieldLabel} ${opLabel.toLowerCase()} ${formatConditionValue(condition.value, fieldDef)}`
}

export function getActiveReportFilterChips(
  filters = {},
  { studios = [], teachers = [], programs = [], catalogKey, columns = [], includeSearch = true } = {},
) {
  const chips = []
  const catalog = resolveCatalog(catalogKey, columns)

  const search = String(filters.search ?? '').trim()
  if (includeSearch && search) {
    chips.push({ id: 'search', label: `Search: ${search}`, remove: { type: 'search' } })
  }
  if (filters.studioId) {
    chips.push({
      id: 'studioId',
      label: `Studio: ${optionLabel(studios, filters.studioId)}`,
      remove: { type: 'key', key: 'studioId' },
    })
  }
  if (filters.teacherId) {
    chips.push({
      id: 'teacherId',
      label: `Teacher: ${optionLabel(teachers, filters.teacherId)}`,
      remove: { type: 'key', key: 'teacherId' },
    })
  }
  if (filters.programId) {
    chips.push({
      id: 'programId',
      label: `Package: ${optionLabel(programs, filters.programId)}`,
      remove: { type: 'key', key: 'programId' },
    })
  }

  for (const condition of getValidReportConditions(filters.conditions)) {
    chips.push({
      id: `condition:${condition.field}:${condition.operator}:${JSON.stringify(condition.value)}`,
      label: summarizeReportCondition(condition, catalog),
      remove: { type: 'condition', field: condition.field },
    })
  }

  return chips
}

export function removeReportFilterChip(filters = {}, chip) {
  const next = { ...filters }
  const action = chip?.remove
  if (!action) return next

  if (action.type === 'search') {
    next.search = ''
    return next
  }
  if (action.type === 'key') {
    next[action.key] = ''
    return next
  }
  if (action.type === 'condition') {
    next.conditions = (filters.conditions || []).filter((c) => c.field !== action.field)
    return next
  }
  return next
}

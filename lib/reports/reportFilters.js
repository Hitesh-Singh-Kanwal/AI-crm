const FILTER_KEYS = [
  'dateFrom',
  'dateTo',
  'datePreset',
  'studioId',
  'teacherId',
  'programId',
  'leadSource',
  'groupBy',
  'comparison',
  'activeWindowDays',
  'status',
]

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

export function buildReportQuery(filters = {}, { page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  }
  const validConditions = getValidReportConditions(filters.conditions)
  if (validConditions.length > 0) {
    params.set('conditions', JSON.stringify(validConditions))
    params.set('conditionLogic', filters.conditionLogic === 'OR' ? 'OR' : 'AND')
  }
  const trimmedSearch = String(filters.search ?? '').trim()
  if (trimmedSearch) params.set('search', trimmedSearch)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params.toString()
}

export function parseReportFiltersFromSearchParams(searchParams) {
  const result = {}
  for (const key of FILTER_KEYS) {
    result[key] = searchParams.get(key) || ''
  }
  const conditionsRaw = searchParams.get('conditions')
  try {
    result.conditions = conditionsRaw ? JSON.parse(conditionsRaw) : []
  } catch {
    result.conditions = []
  }
  result.conditionLogic = searchParams.get('conditionLogic') === 'OR' ? 'OR' : 'AND'
  result.search = searchParams.get('search') || ''
  return result
}

/** Convert a preset day count into YYYY-MM-DD from/to bounds (inclusive trailing window). */
export function dateBoundsFromPresetDays(days) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - Number(days))
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  }
}

export { FILTER_KEYS }

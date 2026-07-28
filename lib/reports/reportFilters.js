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

export function buildReportQuery(filters = {}, { page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  }
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params.toString()
}

export function parseReportFiltersFromSearchParams(searchParams) {
  const result = {}
  for (const key of FILTER_KEYS) {
    result[key] = searchParams.get(key) || ''
  }
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

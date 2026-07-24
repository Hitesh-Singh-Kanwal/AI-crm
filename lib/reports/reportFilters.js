const FILTER_KEYS = ['dateFrom', 'dateTo', 'studioId', 'teacherId', 'programId', 'leadSource', 'groupBy']

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
